import { Injectable } from '@nestjs/common';

type Snapshot = { status: number; headers: [string, string][]; body: Uint8Array };
type Entry = { value: Snapshot; expiresAt: number };

const cachedPaths = new Set(['/api/tasks', '/api/priority-matrix', '/api/context']);
const containerPath = /^\/api\/(task-containers|work-progress)\/[^/]+\/[^/]+$/;
const affectingRoots = new Set([
  'tasks', 'task-containers', 'dependencies', 'projects', 'fronts', 'products',
  'processes', 'phases', 'organizations', 'personal', 'hierarchy', 'cyclic-queue',
  'recurrence-series', 'recurrence-occurrences', 'templates', 'recycle-bin',
  'item-roles', 'item-invitations', 'owner-transfers', 'approvals', 'me',
]);

export function normalizedCachePath(rawUrl: string): string | null {
  const url = new URL(rawUrl, 'https://taskando.internal');
  const path = url.pathname.replace(/\/$/, '') || '/';
  if (!cachedPaths.has(path) && !containerPath.test(path)) return null;
  // Stable sorting preserves the order of repeated parameters, whose first value may be significant.
  const entries = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
  const query = new URLSearchParams(entries).toString();
  return path + (query ? `?${query}` : '');
}

export function affectsCachedProjection(method: string, path: string): boolean {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return false;
  if (/^\/api\/tasks\/[^/]+\/(comments|audit)(?:\/|$)/.test(path)) return false;
  const root = /^\/api\/([^/?]+)/.exec(path)?.[1];
  return Boolean(root && affectingRoots.has(root));
}

export function successfulMcpMutation(body: unknown, response: unknown): boolean {
  if (!body || typeof body !== 'object' || !response || typeof response !== 'object') return false;
  const request = body as { method?: string; params?: { name?: string; arguments?: Record<string, unknown> } };
  const result = (response as { result?: { isError?: boolean; structuredContent?: { status?: number } } }).result;
  if (request.method !== 'tools/call' || !result || result.isError || (result.structuredContent?.status ?? 200) >= 400) return false;
  const name = request.params?.name;
  if (name === 'taskando_create_task' || name === 'taskando_update_task') return true;
  if (name !== 'taskando_request') return false;
  const operation = request.params?.arguments?.operation;
  if (typeof operation !== 'string') return false;
  const match = /^(POST|PATCH|PUT|DELETE) (\/api\/[^ ]+)$/.exec(operation);
  return Boolean(match && affectsCachedProjection(match[1], match[2]));
}

@Injectable()
export class ProjectionCache {
  private readonly entries = new Map<string, Entry>();
  private readonly pending = new Map<string, Promise<Snapshot>>();
  private generation = 0;
  readonly enabled = process.env.TASKANDO_CACHE_ENABLED !== 'false';
  readonly ttlMs = positiveInt(process.env.TASKANDO_CACHE_TTL_SECONDS, 600) * 1000;
  readonly maxEntries = positiveInt(process.env.TASKANDO_CACHE_MAX_ENTRIES, 128);

  invalidate() {
    this.generation += 1;
    this.entries.clear();
    this.pending.clear();
  }

  async read(userId: string, url: string, load: () => Promise<Response>): Promise<Response> {
    const path = normalizedCachePath(url);
    if (!this.enabled || !path) return mark(await load(), 'BYPASS');
    const key = `${userId}\n${path}`;
    const now = Date.now();
    const found = this.entries.get(key);
    if (found && found.expiresAt > now) {
      this.entries.delete(key);
      this.entries.set(key, found);
      return mark(restore(found.value), 'HIT');
    }
    if (found) this.entries.delete(key);
    const inFlight = this.pending.get(key);
    if (inFlight) return mark(restore(await inFlight), 'MISS');
    const generation = this.generation;
    const pending = (async () => {
      const response = await load();
      const headers: [string, string][] = [];
      response.headers.forEach((value, name) => headers.push([name, value]));
      const snapshot: Snapshot = { status: response.status, headers, body: new Uint8Array(await response.arrayBuffer()) };
      if (snapshot.status === 200 && generation === this.generation) {
        this.entries.set(key, { value: snapshot, expiresAt: Date.now() + this.ttlMs });
        while (this.entries.size > this.maxEntries) this.entries.delete(this.entries.keys().next().value!);
      }
      return snapshot;
    })();
    this.pending.set(key, pending);
    try { return mark(restore(await pending), 'MISS'); }
    finally { if (this.pending.get(key) === pending) this.pending.delete(key); }
  }
}

function positiveInt(value: string | undefined, fallback: number): number {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}
function restore(value: Snapshot): Response { return new Response([204, 205, 304].includes(value.status) ? null : value.body.slice(), { status: value.status, headers: value.headers }); }
function mark(response: Response, state: 'HIT' | 'MISS' | 'BYPASS'): Response {
  response.headers.set('X-Taskando-Cache', state);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
