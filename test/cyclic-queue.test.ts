import assert from 'node:assert/strict';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import { completeCyclicTask, dueDateForNewCyclicTask, listCyclicQueue } from '../src/db/cyclic';
import { nextLocalDate } from '../src/db/time-zone';
import * as schema from '../src/db/schema';

test('cyclic queue assigns and clears due dates on release, backfill and completion', async () => {
  const client = new PGlite();
  try {
    await client.exec(`
      create table personal_spaces (id text primary key, owner_user_id text);
      create table notification_preferences (user_id text primary key, time_zone text);
      create table cyclic_queue_states (id text primary key, personal_space_id text unique, released_level integer default 5, level_5_progress integer default 0, level_4_progress integer default 0, level_3_progress integer default 0, level_2_progress integer default 0, revision integer default 0, created_at text default '', updated_at text default '');
      create table cyclic_queue_overrides (id text, task_id text, personal_space_id text, mode text, position integer, created_by_user_id text, created_at text, updated_at text);
      create table tasks (id text primary key, personal_space_id text, author_user_id text, owner_user_id text, organization_id text, title text, description text, task_type text, status text, deleted_at text, deleted_status text, size text, importance text, urgency text, relevance integer, cyclic_position integer, cyclic_reentry_count integer, approval_required boolean, approved_at text, approved_by_user_id text, due_date text, date_at text, start_at text, end_at text, duration_minutes integer, completed_at text, pinned_for_today boolean, inbox_position integer, today_position integer, parent_task_id text, subtask_position integer, created_at text, updated_at text);
      insert into personal_spaces values ('space', 'owner');
      insert into notification_preferences values ('owner', 'Pacific/Kiritimati');
      insert into cyclic_queue_states (id, personal_space_id) values ('state', 'space');
    `);
    const rawDb = drizzle(client, { schema });
    const db = Object.assign(rawDb, { batch: async (statements: { execute(): Promise<unknown> }[]) => Promise.all(statements.map((statement) => statement.execute())) }) as unknown as Parameters<typeof listCyclicQueue>[0];
    const tomorrow = nextLocalDate(new Date(), 'Pacific/Kiritimati');
    assert.equal(await dueDateForNewCyclicTask(db, 'space', 3), tomorrow, 'first cyclic task establishes the released level');
    await client.exec(`
      insert into tasks (id, personal_space_id, author_user_id, owner_user_id, title, description, task_type, status, relevance, cyclic_position, cyclic_reentry_count, due_date, created_at, updated_at)
      values ('high', 'space', 'owner', 'owner', 'High', '', 'cyclic', 'todo', 5, 1, 0, null, '2026-09-10', '2026-09-10'),
             ('low', 'space', 'owner', 'owner', 'Low', '', 'cyclic', 'todo', 3, 2, 0, '2026-09-10', '2026-09-10', '2026-09-10');
    `);
    assert.equal(await dueDateForNewCyclicTask(db, 'space', 3), null, 'new blocked cyclic task has no due date');
    let queue = await listCyclicQueue(db, 'space');
    assert.equal(queue.tasks.find((row) => row.id === 'high')?.dueDate, tomorrow, 'released old task is backfilled');
    assert.equal(queue.tasks.find((row) => row.id === 'low')?.dueDate, null, 'blocked old task is cleared');
    await client.exec("update tasks set due_date = '2026-09-10' where id = 'high'");
    const [high] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, 'high'));
    const first = await completeCyclicTask(db, high);
    assert.equal(first.releasedLevel, 5);
    assert.equal(first.task?.dueDate, tomorrow, 'same-level completion starts a fresh round');
    const [again] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, 'high'));
    const second = await completeCyclicTask(db, again);
    assert.equal(second.releasedLevel, 3);
    queue = await listCyclicQueue(db, 'space');
    assert.equal(queue.tasks.find((row) => row.id === 'high')?.dueDate, null);
    assert.equal(queue.tasks.find((row) => row.id === 'low')?.dueDate, tomorrow);
  } finally {
    await client.close();
  }
});
