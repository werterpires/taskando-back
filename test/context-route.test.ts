import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { GET } from "../src/app/api/context/route";
import { withPersonalContext, type PersonalContext } from "../src/db/current-user";
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
  create table task_assignees (task_id text, user_id text, created_at text);
`;

const now = "2026-09-28T00:00:00.000Z";
const scope = (value: { id: string; kind: string; name: string; organizationId?: string | null }) => ({ id: value.id, kind: value.kind, name: value.name, ...(value.organizationId === undefined ? {} : { organizationId: value.organizationId }) });

async function setup() {
  const client = new PGlite();
  await client.exec(tableDefinitions);
  await client.exec(`
    insert into organizations values ('organization', 'viewer', 'Organization', 'Organization description', '◈', 'active', '${now}', '${now}');
    insert into departments values ('department', 'organization', 'viewer', 'Department', 'Department description', 'active', '${now}', '${now}'), ('denied-department', null, 'other', 'Denied', '', 'active', '${now}', '${now}');
    insert into teams values ('team', 'organization', 'viewer', 'Team', 'Team description', 'active', '${now}', '${now}');
  `);
  const db = drizzle(client, { schema });
  const context = { db, user: { id: "viewer", email: "viewer@example.test", displayName: "Viewer" }, space: { id: "space" } } as unknown as PersonalContext;
  const invoke = (parentType: string, parentId: string) => withPersonalContext(context, () => GET(new Request(`https://taskando.test/api/context?parentType=${parentType}&parentId=${parentId}`)));
  return { client, invoke };
}

test("GET /api/context returns the authorized organization, department, and team scopes", async () => {
  const { client, invoke } = await setup();
  try {
    for (const [parentType, parentId, expected] of [
      ["organization", "organization", scope({ id: "organization", kind: "organization", name: "Organization" })],
      ["department", "department", scope({ id: "department", kind: "department", name: "Department", organizationId: "organization" })],
      ["team", "team", scope({ id: "team", kind: "team", name: "Team", organizationId: "organization" })],
    ] as const) {
      const response = await invoke(parentType, parentId);
      assert.equal(response.status, 200);
      const data = await response.json() as { scope: { id: string; kind: string; name: string; organizationId?: string | null } };
      assert.deepEqual(scope(data.scope), expected);
    }
  } finally { await client.close(); }
});

test("GET /api/context preserves missing and unauthorized context responses", async () => {
  const { client, invoke } = await setup();
  try {
    assert.equal((await invoke("department", "missing")).status, 404);
    assert.equal((await invoke("department", "denied-department")).status, 403);
    assert.equal((await invoke("organization", "missing")).status, 403);
  } finally { await client.close(); }
});
