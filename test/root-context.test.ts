import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { rootContext } from "../src/db/root-context";
import type { PersonalContext } from "../src/db/current-user";
import * as schema from "../src/db/schema";

const tableDefinitions = `
  create table users (id text, email text, display_name text, created_at text, updated_at text);
  create table personal_spaces (id text, owner_user_id text, name text, created_at text);
  create table organizations (id text, owner_user_id text, name text, description text, icon text, status text, created_at text, updated_at text);
  create table organization_members (id text, organization_id text, user_id text, email text, status text, role text, created_at text, updated_at text);
  create table departments (id text, organization_id text, owner_user_id text, name text, description text, status text, created_at text, updated_at text);
  create table teams (id text, organization_id text, owner_user_id text, name text, description text, status text, created_at text, updated_at text);
  create table projects (id text, personal_space_id text, organization_id text, owner_user_id text, author_user_id text, title text, description text, status text, approval_required boolean, approved_at text, approved_by_user_id text, size text, importance text, urgency text, created_at text, updated_at text);
  create table products (id text, personal_space_id text, organization_id text, owner_user_id text, author_user_id text, title text, description text, status text, approval_required boolean, approved_at text, approved_by_user_id text, characteristics_json text, size text, importance text, urgency text, created_at text, updated_at text);
  create table processes (id text, personal_space_id text, organization_id text, owner_user_id text, author_user_id text, title text, description text, status text, approval_required boolean, approved_at text, approved_by_user_id text, auto_complete_when_children_done boolean, size text, importance text, urgency text, created_at text, updated_at text);
  create table tasks (id text, personal_space_id text, author_user_id text, owner_user_id text, organization_id text, title text, description text, task_type text, status text, deleted_at text, deleted_status text, size text, importance text, urgency text, relevance integer, cyclic_position integer, cyclic_reentry_count integer, approval_required boolean, approved_at text, approved_by_user_id text, due_date text, date_at text, start_at text, end_at text, duration_minutes integer, completed_at text, pinned_for_today boolean, inbox_position integer, today_position integer, parent_task_id text, subtask_position integer, created_at text, updated_at text);
  create table hierarchy_attachments (id text, child_type text, child_id text, parent_type text, parent_id text, created_at text, updated_at text);
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

function ids(rows: { id: string }[]) { return rows.map((row) => row.id); }

test("a raiz global classifica anexações e só expõe itens autorizados", async () => {
  const client = new PGlite();
  await client.exec(tableDefinitions);
  const db = drizzle(client, { schema });
  const now = "2026-09-11T00:00:00.000Z";
  const viewer = { id: "viewer", email: "viewer@example.test", displayName: "Viewer", createdAt: now, updatedAt: now };
  const space = { id: "viewer-space", ownerUserId: viewer.id, name: "Viewer", createdAt: now };
  const item = (id: string, overrides: Record<string, string | number | boolean | null> = {}) => ({ id, personal_space_id: space.id, organization_id: null, owner_user_id: viewer.id, author_user_id: viewer.id, title: id, description: "", status: "todo", approval_required: false, approved_at: null, approved_by_user_id: null, size: null, importance: null, urgency: null, created_at: now, updated_at: now, ...overrides });
  const attach = (id: string, childType: string, childId: string, parentType: string | null, parentId: string | null) => insert(client, "hierarchy_attachments", { id, child_type: childType, child_id: childId, parent_type: parentType, parent_id: parentId, created_at: now, updated_at: now });

  await insert(client, "users", { id: viewer.id, email: viewer.email, display_name: viewer.displayName, created_at: now, updated_at: now });
  await insert(client, "personal_spaces", { id: space.id, owner_user_id: viewer.id, name: space.name, created_at: now });

  await insert(client, "organizations", { id: "organization-owner", owner_user_id: viewer.id, name: "Owner", description: "", icon: "◈", status: "active", created_at: now, updated_at: now });
  await insert(client, "organizations", { id: "organization-member", owner_user_id: "other", name: "Member", description: "", icon: "◈", status: "active", created_at: now, updated_at: now });
  await insert(client, "organizations", { id: "organization-role", owner_user_id: "other", name: "Role", description: "", icon: "◈", status: "active", created_at: now, updated_at: now });
  await insert(client, "organizations", { id: "organization-pending", owner_user_id: "other", name: "Pending", description: "", icon: "◈", status: "active", created_at: now, updated_at: now });
  await insert(client, "organizations", { id: "organization-denied", owner_user_id: "other", name: "Denied", description: "", icon: "◈", status: "active", created_at: now, updated_at: now });
  await insert(client, "organization_members", { id: "member-active", organization_id: "organization-member", user_id: viewer.id, email: viewer.email, status: "active", role: "watcher", created_at: now, updated_at: now });
  await insert(client, "organization_members", { id: "member-pending", organization_id: "organization-pending", user_id: null, email: viewer.email, status: "pending", role: "watcher", created_at: now, updated_at: now });
  await insert(client, "item_role_assignments", { id: "organization-role-assignment", item_type: "organization", item_id: "organization-role", user_id: viewer.id, role: "watcher", created_at: now });

  for (const id of ["department-absent", "department-null", "department-partial", "department-nested"]) await insert(client, "departments", { id, organization_id: null, owner_user_id: viewer.id, name: id, description: "", status: "active", created_at: now, updated_at: now });
  await attach("department-null-link", "department", "department-null", null, null);
  await attach("department-partial-link", "department", "department-partial", "organization", null);
  await attach("department-nested-link", "department", "department-nested", "organization", "organization-owner");
  await insert(client, "teams", { id: "team-absent", organization_id: null, owner_user_id: viewer.id, name: "team", description: "", status: "active", created_at: now, updated_at: now });

  await insert(client, "projects", item("project-owner"));
  await insert(client, "projects", item("project-author", { owner_user_id: "other", author_user_id: viewer.id }));
  await insert(client, "projects", item("project-role", { owner_user_id: "other", author_user_id: "other" }));
  await insert(client, "projects", item("project-denied", { personal_space_id: "other-space", owner_user_id: "other", author_user_id: "other" }));
  await insert(client, "projects", item("project-in-organization", { organization_id: "organization-member" }));
  await attach("project-role-assignment", "project", "project-role", null, null);
  await insert(client, "item_role_assignments", { id: "project-role-assignment", item_type: "project", item_id: "project-role", user_id: viewer.id, role: "watcher", created_at: now });
  await insert(client, "products", { ...item("product-owner"), characteristics_json: '["feature"]' });
  await insert(client, "processes", { ...item("process-owner"), auto_complete_when_children_done: false });

  const task = (id: string, overrides: Record<string, string | number | boolean | null> = {}) => ({ id, personal_space_id: space.id, author_user_id: viewer.id, owner_user_id: viewer.id, organization_id: null, title: id, description: "", task_type: "simple", status: "todo", deleted_at: null, deleted_status: null, size: null, importance: null, urgency: null, relevance: null, cyclic_position: 1, cyclic_reentry_count: 0, approval_required: false, approved_at: null, approved_by_user_id: null, due_date: null, date_at: null, start_at: null, end_at: null, duration_minutes: null, completed_at: null, pinned_for_today: false, inbox_position: 1, today_position: 1, parent_task_id: null, subtask_position: null, created_at: now, updated_at: now, ...overrides });
  await insert(client, "tasks", task("task-owner"));
  await insert(client, "tasks", task("task-author", { owner_user_id: "other", author_user_id: viewer.id }));
  await insert(client, "tasks", task("task-role", { owner_user_id: "other", author_user_id: "other" }));
  await insert(client, "tasks", task("task-denied", { personal_space_id: "other-space", owner_user_id: "other", author_user_id: "other" }));
  await insert(client, "tasks", task("task-subtask", { parent_task_id: "task-owner" }));
  await insert(client, "tasks", task("task-trashed", { deleted_at: now }));
  await insert(client, "tasks", task("task-null"));
  await insert(client, "tasks", task("task-partial"));
  await insert(client, "tasks", task("task-nested"));
  await attach("task-null-link", "task", "task-null", null, null);
  await attach("task-partial-link", "task", "task-partial", null, "organization-owner");
  await attach("task-nested-link", "task", "task-nested", "project", "project-owner");
  await insert(client, "item_role_assignments", { id: "task-role-assignment", item_type: "task", item_id: "task-role", user_id: viewer.id, role: "watcher", created_at: now });

  const result = await rootContext({ db, user: viewer, space } as unknown as PersonalContext);

  assert.deepEqual(ids(result.organizations), ["organization-member", "organization-owner", "organization-role"]);
  assert.deepEqual(ids(result.departments), ["department-absent", "department-null"]);
  assert.deepEqual(ids(result.teams), ["team-absent"]);
  assert.deepEqual(ids(result.projects), ["project-owner", "project-author", "project-role"]);
  assert.deepEqual(ids(result.products), ["product-owner"]);
  assert.deepEqual(result.products[0]?.characteristics, ["feature"]);
  assert.deepEqual(ids(result.processes), ["process-owner"]);
  assert.deepEqual(ids(result.tasks), ["task-owner", "task-author", "task-role", "task-null"]);
  assert.equal(result.canCreate, false);

  await client.close();
});
