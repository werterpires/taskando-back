import assert from 'node:assert/strict';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { GET } from '../src/app/api/tasks/route';
import { withPersonalContext, type PersonalContext } from '../src/db/current-user';
import * as schema from '../src/db/schema';

test('GET /api/tasks preserves ordered visible task projection with bounded related rows', async () => {
  const client = new PGlite();
  try {
    await client.exec(`
      create table users (id text, display_name text);
      create table personal_spaces (id text);
      create table tasks (id text, personal_space_id text, author_user_id text, owner_user_id text, organization_id text, title text, description text, task_type text, status text, deleted_at text, deleted_status text, size text, importance text, urgency text, relevance integer, cyclic_position integer, cyclic_reentry_count integer, approval_required boolean, approved_at text, approved_by_user_id text, due_date text, date_at text, start_at text, end_at text, duration_minutes integer, completed_at text, pinned_for_today boolean, inbox_position integer, today_position integer, parent_task_id text, subtask_position integer, created_at text, updated_at text);
      create table cyclic_queue_states (id text, personal_space_id text, released_level integer default 5, level_5_progress integer default 0, level_4_progress integer default 0, level_3_progress integer default 0, level_2_progress integer default 0, revision integer default 0, created_at text default '', updated_at text default '');
      create table dependency_edges (id text, predecessor_type text, predecessor_id text, successor_type text, successor_id text, created_at text);
      create table hierarchy_attachments (id text, child_type text, child_id text, parent_type text, parent_id text, created_at text, updated_at text);
      create table recurrence_occurrences (id text, series_id text, task_id text, scheduled_at text);
      create table recurrence_series (id text, active boolean, definition_json text);
      create table task_assignees (task_id text, user_id text, created_at text);
      create table item_role_assignments (id text, item_type text, item_id text, user_id text, role text, created_at text);
      create table organization_members (id text, organization_id text, user_id text, email text, status text, role text, created_at text, updated_at text);
      create table projects (id text, title text);
      create table phases (id text, title text, status text);
      create table tags (id text, personal_space_id text, name text, created_at text);
      create table task_tags (task_id text, tag_id text);
      create table checklist_items (id text, task_id text, completed boolean);
    `);
    await client.exec(`
      insert into users values ('viewer', 'Viewer');
      insert into personal_spaces values ('space');
      insert into projects values ('project', 'Project');
      insert into tasks (id, personal_space_id, author_user_id, owner_user_id, organization_id, title, description, task_type, status, deleted_at, created_at, updated_at)
        values ('older', 'space', 'viewer', 'viewer', null, 'Older', '', 'simple', 'todo', null, '2026-09-10', '2026-09-10'),
               ('newer', 'space', 'viewer', 'viewer', null, 'Newer', '', 'simple', 'todo', null, '2026-09-11', '2026-09-11'),
               ('hidden', 'other-space', 'other', 'other', null, 'Hidden', '', 'simple', 'todo', null, '2026-09-12', '2026-09-12'),
               ('member', 'other-space', 'other', 'other', 'member-org', 'Member', '', 'simple', 'todo', null, '2026-09-13', '2026-09-13'),
               ('assigned', 'other-space', 'other', 'other', 'assigned-org', 'Assigned', '', 'simple', 'todo', null, '2026-09-14', '2026-09-14'),
               ('completed', 'space', 'viewer', 'viewer', null, 'Completed', '', 'simple', 'completed', null, '2026-09-15', '2026-09-15'),
               ('cancelled', 'space', 'viewer', 'viewer', null, 'Cancelled', '', 'simple', 'cancelled', null, '2026-09-16', '2026-09-16'),
               ('archived', 'space', 'viewer', 'viewer', null, 'Archived', '', 'simple', 'archived', null, '2026-09-17', '2026-09-17');
      insert into organization_members (id, organization_id, user_id, email, status, role) values ('membership', 'member-org', 'viewer', 'viewer@example.test', 'active', 'watcher');
      insert into task_assignees (task_id, user_id) values ('assigned', 'viewer');
      insert into hierarchy_attachments (id, child_type, child_id, parent_type, parent_id) values ('link', 'task', 'newer', 'project', 'project');
      insert into tags values ('tag', 'space', 'Visible', ''), ('foreign-tag', 'other-space', 'Foreign', '');
      insert into task_tags values ('newer', 'tag'), ('newer', 'foreign-tag');
      insert into checklist_items values ('check', 'newer', true);
    `);
    const db = drizzle(client, { schema });
    const context = { db, user: { id: 'viewer' }, space: { id: 'space' } } as unknown as PersonalContext;
    const result = await withPersonalContext(context, () => GET(new Request('https://taskando.test/api/tasks')));
    assert.equal(result.status, 200);
    const payload = await result.json() as { tasks: { id: string; parentName: string | null; tags: { name: string }[]; checklistTotal: number; checklistCompleted: number; dependencyState: string; assignees: unknown[] }[] };
    assert.deepEqual(payload.tasks.map((task) => task.id), ['assigned', 'member', 'newer', 'older']);
    const projected = payload.tasks[2];
    assert.equal(projected.parentName, 'Project');
    assert.deepEqual(projected.tags.map((tag) => tag.name), ['Visible']);
    assert.equal(projected.checklistTotal, 1);
    assert.equal(projected.checklistCompleted, 1);
    assert.equal(projected.dependencyState, 'independent');
    assert.deepEqual(projected.assignees, []);

    const selected = await withPersonalContext(context, () => GET(new Request('https://taskando.test/api/tasks?includeClosed=cancelled,completed,completed')));
    assert.equal(selected.status, 200);
    const selectedPayload = await selected.json() as { tasks: { id: string }[] };
    assert.deepEqual(selectedPayload.tasks.map((task) => task.id), ['cancelled', 'completed', 'assigned', 'member', 'newer', 'older']);

    const invalid = await withPersonalContext(context, () => GET(new Request('https://taskando.test/api/tasks?includeClosed=done')));
    assert.equal(invalid.status, 400);
    assert.match((await invalid.json() as { error: string }).error, /includeClosed inválido/);
  } finally { await client.close(); }
});
