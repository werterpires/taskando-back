import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { GET } from "../src/app/api/lists/[id]/tasks/route";
import { withPersonalContext, type PersonalContext } from "../src/db/current-user";
import * as schema from "../src/db/schema";

test("GET /api/lists/:id/tasks aplica includeClosed sem expor listas de outro espaço", async () => {
  const client = new PGlite();
  try {
    await client.exec(`
      create table users (id text, display_name text);
      create table personal_spaces (id text);
      create table tasks (id text, personal_space_id text, author_user_id text, owner_user_id text, organization_id text, title text, description text, task_type text, status text, deleted_at text, deleted_status text, size text, importance text, urgency text, relevance integer, cyclic_position integer, cyclic_reentry_count integer, approval_required boolean, approved_at text, approved_by_user_id text, due_date text, date_at text, start_at text, end_at text, duration_minutes integer, completed_at text, pinned_for_today boolean, inbox_position integer, today_position integer, parent_task_id text, subtask_position integer, created_at text, updated_at text);
      create table task_lists (id text, personal_space_id text, author_user_id text, name text, created_at text, updated_at text);
      create table task_list_tasks (list_id text, task_id text);
      create table cyclic_queue_states (id text, personal_space_id text, released_level integer default 5, level_5_progress integer default 0, level_4_progress integer default 0, level_3_progress integer default 0, level_2_progress integer default 0, revision integer default 0, created_at text default '', updated_at text default '');
      create table dependency_edges (id text, predecessor_type text, predecessor_id text, successor_type text, successor_id text, created_at text);
      create table hierarchy_attachments (id text, child_type text, child_id text, parent_type text, parent_id text, created_at text, updated_at text);
      create table recurrence_occurrences (id text, series_id text, task_id text, scheduled_at text);
      create table recurrence_series (id text, active boolean, definition_json text);
      create table task_assignees (task_id text, user_id text, created_at text);
      create table phases (id text, title text, status text);
      create table tags (id text, personal_space_id text, name text, created_at text);
      create table task_tags (task_id text, tag_id text);
      create table checklist_items (id text, task_id text, completed boolean);
      insert into users values ('viewer', 'Viewer');
      insert into personal_spaces values ('space'), ('other-space');
      insert into task_lists values ('list', 'space', 'viewer', 'List', '', ''), ('foreign-list', 'other-space', 'viewer', 'Foreign', '', '');
      insert into tasks (id, personal_space_id, author_user_id, owner_user_id, organization_id, title, description, task_type, status, deleted_at, created_at, updated_at)
        values ('open', 'space', 'viewer', 'viewer', null, 'Open', '', 'simple', 'todo', null, '2026-09-16', '2026-09-16'),
               ('completed', 'space', 'viewer', 'viewer', null, 'Completed', '', 'simple', 'completed', null, '2026-09-17', '2026-09-17');
      insert into task_list_tasks values ('list', 'open'), ('list', 'completed');
    `);
    const db = drizzle(client, { schema });
    const context = { db, user: { id: "viewer" }, space: { id: "space" } } as unknown as PersonalContext;
    const invoke = (url: string, id = "list") => withPersonalContext(context, () => GET(new Request(url), { params: Promise.resolve({ id }) }));

    const open = await invoke("https://taskando.test/api/lists/list/tasks");
    assert.equal(open.status, 200);
    assert.deepEqual((await open.json() as { tasks: { id: string }[] }).tasks.map((task) => task.id), ["open"]);

    const completed = await invoke("https://taskando.test/api/lists/list/tasks?includeClosed=completed");
    assert.deepEqual((await completed.json() as { tasks: { id: string }[] }).tasks.map((task) => task.id), ["completed", "open"]);

    assert.equal((await invoke("https://taskando.test/api/lists/list/tasks?includeClosed=unknown")).status, 400);
    assert.equal((await invoke("https://taskando.test/api/lists/foreign-list/tasks", "foreign-list")).status, 404);
  } finally { await client.close(); }
});
