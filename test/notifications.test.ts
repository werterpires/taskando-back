import assert from 'node:assert/strict';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { GET, PATCH } from '../src/app/api/notifications/route';
import { withPersonalContext, type PersonalContext } from '../src/db/current-user';
import * as schema from '../src/db/schema';

async function fixture() {
  const client = new PGlite();
  await client.exec(`
    create table notifications (id text, recipient_user_id text, actor_user_id text, task_id text, reminder_id text, type text, event_key text, summary text, read_at text, created_at text);
    create table reminders (id text, owner_user_id text);
    create table dependency_edges (id text, predecessor_type text, predecessor_id text, successor_type text, successor_id text, created_at text);
    insert into reminders values ('mine', 'viewer'), ('theirs', 'other');
  `);
  const db = drizzle(client, { schema });
  const context = { db, user: { id: 'viewer' }, space: { id: 'space' } } as unknown as PersonalContext;
  const insert = async (id: string, recipientUserId = 'viewer', readAt: string | null = null, createdAt = '2026-09-14T00:00:00Z') => {
    await db.insert(schema.notifications).values({ id, recipientUserId, actorUserId: null, taskId: null, reminderId: recipientUserId === 'viewer' ? 'mine' : 'theirs', type: 'reminder', eventKey: id, summary: id, readAt, createdAt });
  };
  const patch = (body: unknown) => withPersonalContext(context, () => PATCH(new Request('http://localhost/api/notifications', { method: 'PATCH', body: JSON.stringify(body) })));
  return { client, db, context, insert, patch };
}

test('GET filters unread notifications before the 60-row limit and preserves the default listing', async () => {
  const { client, context, insert } = await fixture();
  try {
    await insert('unread-old', 'viewer', null, '2026-09-12T00:00:00Z');
    await insert('unread-new', 'viewer', null, '2026-09-13T00:00:00Z');
    for (let i = 0; i < 60; i++) await insert(`read-${i}`, 'viewer', '2026-09-14T00:00:00Z', `2026-09-14T00:${String(i).padStart(2, '0')}:00Z`);
    await insert('foreign', 'other', null, '2026-09-15T00:00:00Z');
    const defaultResponse = await withPersonalContext(context, () => GET(new Request('http://localhost/api/notifications')));
    assert.equal(defaultResponse.status, 200);
    const defaultPayload = await defaultResponse.json() as { notifications: { id: string }[]; unreadCount: number };
    assert.equal(defaultPayload.notifications.length, 60);
    assert.equal(defaultPayload.unreadCount, 0);
    const unreadResponse = await withPersonalContext(context, () => GET(new Request('http://localhost/api/notifications?unreadOnly=1')));
    const unreadPayload = await unreadResponse.json() as { notifications: { id: string }[]; unreadCount: number };
    assert.deepEqual(unreadPayload.notifications.map((row) => row.id), ['unread-new', 'unread-old']);
    assert.equal(unreadPayload.unreadCount, 2);
  } finally { await client.close(); }
});

test('bulk PATCH reads every unread notification for its recipient and remains idempotent', async () => {
  const { client, db, insert, patch } = await fixture();
  try {
    for (let i = 0; i < 70; i++) await insert(`mine-${i}`);
    await insert('already-read', 'viewer', '2026-09-01T00:00:00Z');
    await insert('foreign', 'other');
    assert.equal((await patch({ all: true, read: true })).status, 200);
    const mine = await db.select().from(schema.notifications);
    assert.equal(mine.filter((row) => row.recipientUserId === 'viewer' && row.readAt !== null).length, 71);
    assert.equal(mine.find((row) => row.id === 'already-read')?.readAt, '2026-09-01T00:00:00Z');
    assert.equal(mine.find((row) => row.id === 'foreign')?.readAt, null);
    const readAt = mine.find((row) => row.id === 'mine-0')?.readAt;
    assert.equal((await patch({ all: true, read: true })).status, 200);
    assert.equal((await db.select().from(schema.notifications)).find((row) => row.id === 'mine-0')?.readAt, readAt);
  } finally { await client.close(); }
});

test('PATCH rejects ambiguous payloads and preserves individual read and unread behavior', async () => {
  const { client, db, insert, patch } = await fixture();
  try {
    await insert('mine');
    await insert('foreign', 'other');
    for (const body of [{ all: true, read: true, id: 'mine' }, { all: true, read: false }, { id: 'mine', read: true, all: false }, { id: 'mine' }, { id: 7, read: true }, null]) {
      assert.equal((await patch(body)).status, 400);
    }
    assert.equal((await patch({ id: 'foreign', read: true })).status, 404);
    assert.equal((await patch({ id: 'mine', read: true })).status, 200);
    assert.ok((await db.select().from(schema.notifications)).find((row) => row.id === 'mine')?.readAt);
    assert.equal((await patch({ id: 'mine', read: false })).status, 200);
    assert.equal((await db.select().from(schema.notifications)).find((row) => row.id === 'mine')?.readAt, null);
  } finally { await client.close(); }
});

test('notification routes retain authentication', async () => {
  assert.equal((await GET(new Request('http://localhost/api/notifications?unreadOnly=1'))).status, 401);
  assert.equal((await PATCH(new Request('http://localhost/api/notifications', { method: 'PATCH', body: JSON.stringify({ all: true, read: true }) }))).status, 401);
});
