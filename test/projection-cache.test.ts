import assert from 'node:assert/strict';
import test from 'node:test';
import { directlyViewableTask } from '../src/db/authorization';
import { affectsCachedProjection, normalizedCachePath, ProjectionCache, successfulMcpMutation } from '../src/http/projection-cache';

function cache(maxEntries = 128) {
  const old = process.env.TASKANDO_CACHE_MAX_ENTRIES;
  process.env.TASKANDO_CACHE_MAX_ENTRIES = String(maxEntries);
  const instance = new ProjectionCache();
  if (old === undefined) delete process.env.TASKANDO_CACHE_MAX_ENTRIES;
  else process.env.TASKANDO_CACHE_MAX_ENTRIES = old;
  return instance;
}
const response = (value: unknown, status = 200) => Response.json(value, { status });
const body = (result: Response) => result.json();

test('cache isolates users, normalizes query order and returns independent snapshots', async () => {
  const subject = cache(); let calls = 0;
  const load = async () => response({ value: ++calls });
  const first = await subject.read('alice', '/api/context?b=2&a=1', load);
  assert.equal(first.headers.get('X-Taskando-Cache'), 'MISS');
  assert.equal(first.headers.get('Cache-Control'), 'no-store');
  first.headers.set('X-Changed', 'yes');
  const second = await subject.read('alice', '/api/context?a=1&b=2', load);
  assert.equal(second.headers.get('X-Taskando-Cache'), 'HIT');
  assert.equal(second.headers.get('X-Changed'), null);
  assert.deepEqual(await body(second), { value: 1 });
  assert.equal((await body(await subject.read('bob', '/api/context?a=1&b=2', load)) as { value: number }).value, 2);
  assert.equal(calls, 2);
});

test('cache expires by TTL and evicts least recently used entry', async () => {
  const subject = cache(2);
  const original = Date.now;
  let now = 10_000; Date.now = () => now;
  try {
    let calls = 0; const load = async () => response({ value: ++calls });
    await subject.read('u', '/api/context?a=1', load);
    await subject.read('u', '/api/context?a=2', load);
    await subject.read('u', '/api/context?a=1', load);
    await subject.read('u', '/api/context?a=3', load);
    assert.equal((await body(await subject.read('u', '/api/context?a=2', load)) as { value: number }).value, 4);
    now += subject.ttlMs + 1;
    assert.equal((await body(await subject.read('u', '/api/context?a=3', load)) as { value: number }).value, 5);
  } finally { Date.now = original; }
});

test('coalesces misses, bypasses unlisted paths and does not cache errors', async () => {
  const subject = cache(); let calls = 0;
  let finish!: (value: Response) => void;
  const load = () => { calls += 1; return new Promise<Response>((resolve) => { finish = resolve; }); };
  const a = subject.read('u', '/api/tasks', load);
  const b = subject.read('u', '/api/tasks', load);
  assert.equal(calls, 1);
  finish(response({ ok: true }));
  assert.equal((await a).headers.get('X-Taskando-Cache'), 'MISS');
  assert.equal((await b).headers.get('X-Taskando-Cache'), 'MISS');
  assert.equal((await subject.read('u', '/api/tasks', load)).headers.get('X-Taskando-Cache'), 'HIT');
  assert.equal((await subject.read('u', '/api/notifications', async () => response({}))).headers.get('X-Taskando-Cache'), 'BYPASS');
  let errors = 0;
  const bad = () => { errors += 1; return Promise.resolve(response({ error: true }, 503)); };
  await subject.read('u', '/api/context', bad);
  await subject.read('u', '/api/context', bad);
  assert.equal(errors, 2);
});

test('generation invalidation prevents an old in-flight read from repopulating cache', async () => {
  const subject = cache(); let finish!: (value: Response) => void;
  const oldRead = subject.read('u', '/api/tasks', () => new Promise((resolve) => { finish = resolve; }));
  subject.invalidate();
  const fresh = await subject.read('u', '/api/tasks', async () => response({ version: 2 }));
  finish(response({ version: 1 }));
  assert.deepEqual(await body(await oldRead), { version: 1 });
  assert.deepEqual(await body(fresh), { version: 2 });
  assert.deepEqual(await body(await subject.read('u', '/api/tasks', async () => response({ version: 3 }))), { version: 2 });
});

test('classifies HTTP and MCP projection mutations without invalidating reads or comments', () => {
  assert.equal(normalizedCachePath('/api/context?z=2&a=1'), '/api/context?a=1&z=2');
  assert.notEqual(normalizedCachePath('/api/context?parentId=one&parentId=two'), normalizedCachePath('/api/context?parentId=two&parentId=one'));
  assert.equal(normalizedCachePath('/api/tasks/one'), null);
  assert.equal(affectsCachedProjection('PATCH', '/api/tasks/id'), true);
  assert.equal(affectsCachedProjection('POST', '/api/tasks/id/comments'), false);
  assert.equal(affectsCachedProjection('POST', '/api/notifications'), false);
  const ok = { result: { structuredContent: { status: 200 }, isError: false } };
  assert.equal(successfulMcpMutation({ method: 'tools/call', params: { name: 'taskando_update_task' } }, ok), true);
  assert.equal(successfulMcpMutation({ method: 'tools/call', params: { name: 'taskando_get' } }, ok), false);
  assert.equal(successfulMcpMutation({ method: 'tools/call', params: { name: 'taskando_request', arguments: { operation: 'POST /api/tasks/[id]/comments' } } }, ok), false);
  assert.equal(successfulMcpMutation({ method: 'tools/call', params: { name: 'taskando_request', arguments: { operation: 'PATCH /api/tasks/[id]' } } }, { result: { isError: true } }), false);
});

test('direct task grant retains owner, author and personal-space access but rejects deleted tasks', () => {
  const task = { id: 'task', ownerUserId: 'other', authorUserId: 'other', personalSpaceId: 'mine', organizationId: null, deletedAt: null };
  assert.equal(directlyViewableTask(task, 'me', 'mine'), true);
  assert.equal(directlyViewableTask({ ...task, personalSpaceId: 'other' }, 'me', 'mine'), false);
  assert.equal(directlyViewableTask({ ...task, ownerUserId: 'me', organizationId: 'org' }, 'me', 'mine'), true);
  assert.equal(directlyViewableTask({ ...task, personalSpaceId: 'other', organizationId: 'org' }, 'me', 'mine', new Set(['task'])), true);
  assert.equal(directlyViewableTask({ ...task, personalSpaceId: 'other', organizationId: 'org' }, 'me', 'mine', new Set(), new Set(['org'])), true);
  assert.equal(directlyViewableTask({ ...task, authorUserId: 'me', organizationId: 'org', deletedAt: '2026-09-14' }, 'me', 'mine'), false);
});
