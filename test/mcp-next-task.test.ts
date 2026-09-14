import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { withPersonalContext, type PersonalContext } from "../src/db/current-user";
import * as schema from "../src/db/schema";
import { nextTaskForItem } from "../src/mcp/query";
import { mcpTools } from "../src/mcp/server";

const tableDefinitions = `
  create table users (id text, email text, display_name text, created_at text, updated_at text);
  create table personal_spaces (id text, owner_user_id text, name text, created_at text);
  create table projects (id text, personal_space_id text, organization_id text, owner_user_id text, author_user_id text, title text, description text, status text, approval_required boolean, approved_at text, approved_by_user_id text, size text, importance text, urgency text, created_at text, updated_at text);
  create table products (id text, personal_space_id text, organization_id text, owner_user_id text, author_user_id text, title text, description text, status text, approval_required boolean, approved_at text, approved_by_user_id text, characteristics_json text, size text, importance text, urgency text, created_at text, updated_at text);
  create table processes (id text, personal_space_id text, organization_id text, owner_user_id text, author_user_id text, title text, description text, status text, approval_required boolean, approved_at text, approved_by_user_id text, auto_complete_when_children_done boolean, size text, importance text, urgency text, created_at text, updated_at text);
  create table phases (id text, process_id text, personal_space_id text, organization_id text, owner_user_id text, author_user_id text, title text, description text, status text, approval_required boolean, approved_at text, approved_by_user_id text, position integer, size text, importance text, urgency text, created_at text, updated_at text);
  create table tasks (id text, personal_space_id text, author_user_id text, owner_user_id text, organization_id text, title text, description text, task_type text, status text, deleted_at text, deleted_status text, size text, importance text, urgency text, relevance integer, cyclic_position integer, cyclic_reentry_count integer, approval_required boolean, approved_at text, approved_by_user_id text, due_date text, date_at text, start_at text, end_at text, duration_minutes integer, completed_at text, pinned_for_today boolean, inbox_position integer, today_position integer, parent_task_id text, subtask_position integer, created_at text, updated_at text);
  create table cyclic_queue_states (id text, personal_space_id text unique, released_level integer default 5, level_5_progress integer default 0, level_4_progress integer default 0, level_3_progress integer default 0, level_2_progress integer default 0, revision integer default 0, created_at text default '', updated_at text default '');
  create table hierarchy_attachments (id text, child_type text, child_id text, parent_type text, parent_id text, created_at text, updated_at text);
  create table dependency_edges (id text, predecessor_type text, predecessor_id text, successor_type text, successor_id text, created_at text);
  create table item_role_assignments (id text, item_type text, item_id text, user_id text, role text, created_at text);
  create table recurrence_occurrences (id text, series_id text, task_id text);
`;

function literal(value: string | number | boolean | null) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  return `'${value.replaceAll("'", "''")}'`;
}

async function insert(client: PGlite, table: string, row: Record<string, string | number | boolean | null>) {
  const columns = Object.keys(row);
  await client.query(`insert into ${table} (${columns.join(", ")}) values (${columns.map((column) => literal(row[column]!)).join(", ")})`);
}

test("taskando_next_task is a read-only MCP tool", () => {
  const tool = mcpTools.find((candidate) => candidate.name === "taskando_next_task");
  assert.ok(tool);
  assert.equal(tool.annotations.readOnlyHint, true);
  assert.deepEqual(tool.inputSchema.required, ["type", "id"]);
});

test("selects an earliest descendant at random and returns its parent and visible direct dependents", async () => {
  const client = new PGlite();
  await client.exec(tableDefinitions);
  const db = drizzle(client, { schema });
  const now = "2026-09-11T00:00:00.000Z";
  const viewer = { id: "viewer", email: "viewer@example.test", displayName: "Viewer", createdAt: now, updatedAt: now };
  const space = { id: "viewer-space", ownerUserId: viewer.id, name: "Viewer", createdAt: now };
  const item = (id: string) => ({ id, personal_space_id: space.id, organization_id: null, owner_user_id: viewer.id, author_user_id: viewer.id, title: id, description: "", status: "todo", approval_required: false, approved_at: null, approved_by_user_id: null, size: null, importance: null, urgency: null, created_at: now, updated_at: now });
  const task = (id: string, overrides: Record<string, string | number | boolean | null> = {}) => ({ id, personal_space_id: space.id, author_user_id: viewer.id, owner_user_id: viewer.id, organization_id: null, title: id, description: "", task_type: "simple", status: "todo", deleted_at: null, deleted_status: null, size: null, importance: null, urgency: null, relevance: null, cyclic_position: 1, cyclic_reentry_count: 0, approval_required: false, approved_at: null, approved_by_user_id: null, due_date: null, date_at: null, start_at: null, end_at: null, duration_minutes: null, completed_at: null, pinned_for_today: false, inbox_position: 1, today_position: 1, parent_task_id: null, subtask_position: null, created_at: now, updated_at: now, ...overrides });
  const attach = (id: string, childType: string, childId: string, parentType: string, parentId: string) => insert(client, "hierarchy_attachments", { id, child_type: childType, child_id: childId, parent_type: parentType, parent_id: parentId, created_at: now, updated_at: now });

  await insert(client, "users", { id: viewer.id, email: viewer.email, display_name: viewer.displayName, created_at: now, updated_at: now });
  await insert(client, "personal_spaces", { id: space.id, owner_user_id: viewer.id, name: space.name, created_at: now });
  await insert(client, "projects", item("project"));
  await insert(client, "projects", item("empty-project"));
  await insert(client, "projects", { ...item("denied-project"), personal_space_id: "other-space", owner_user_id: "other", author_user_id: "other" });
  await insert(client, "products", { ...item("product"), characteristics_json: "[]" });
  await insert(client, "processes", { ...item("process"), auto_complete_when_children_done: false });
  await insert(client, "phases", { ...item("phase"), process_id: "process", position: 0 });
  await attach("project-product", "product", "product", "project", "project");
  await attach("product-process", "process", "process", "product", "product");
  await attach("process-phase", "phase", "phase", "process", "process");

  await insert(client, "tasks", task("a-earliest", { due_date: "2026-09-12" }));
  await insert(client, "tasks", task("parent", { due_date: "2026-10-01" }));
  await insert(client, "tasks", task("b-earliest", { due_date: "2026-09-12", parent_task_id: "parent" }));
  await insert(client, "tasks", task("later", { due_date: "2026-09-20" }));
  await insert(client, "tasks", task("no-date"));
  await insert(client, "tasks", task("completed-earlier", { due_date: "2026-09-01", status: "completed" }));
  await insert(client, "tasks", task("deleted-earlier", { due_date: "2026-09-01", deleted_at: now }));
  await insert(client, "tasks", task("dependent-visible"));
  await insert(client, "tasks", task("dependent-hidden", { personal_space_id: "other-space", owner_user_id: "other", author_user_id: "other" }));
  for (const id of ["a-earliest", "parent", "later", "no-date", "completed-earlier", "deleted-earlier", "dependent-visible"]) await attach(`phase-${id}`, "task", id, "phase", "phase");
  await insert(client, "dependency_edges", { id: "edge-visible", predecessor_type: "task", predecessor_id: "a-earliest", successor_type: "task", successor_id: "dependent-visible", created_at: now });
  await insert(client, "dependency_edges", { id: "edge-hidden", predecessor_type: "task", predecessor_id: "a-earliest", successor_type: "task", successor_id: "dependent-hidden", created_at: now });

  const context = { db, user: viewer, space } as unknown as PersonalContext;
  const first = await withPersonalContext(context, () => nextTaskForItem({ type: "project", id: "project" }, () => 0));
  assert.equal(first.task?.id, "a-earliest");
  assert.equal(first.task?.dueDate, "2026-09-12");
  assert.deepEqual(first.task?.parent, { type: "phase", id: "phase", title: "phase" });
  assert.deepEqual(first.task?.directDependentTaskIds, ["dependent-visible"]);
  assert.equal(first.tieCount, 2);

  const second = await withPersonalContext(context, () => nextTaskForItem({ type: "project", id: "project" }, () => 0.999));
  assert.equal(second.task?.id, "b-earliest");
  assert.deepEqual(second.task?.parent, { type: "task", id: "parent", title: "parent" });

  const empty = await withPersonalContext(context, () => nextTaskForItem({ type: "project", id: "empty-project" }));
  assert.equal(empty.task, null);

  await assert.rejects(
    withPersonalContext(context, () => nextTaskForItem({ type: "project", id: "denied-project" })),
    /não encontrado ou sem acesso/i,
  );
  await client.close();
});
