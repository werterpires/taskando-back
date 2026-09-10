import { extname, join, resolve } from 'node:path';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { Pool } from 'pg';
import { databaseSslOptions } from '../src/db/ssl';

const excludedTables = new Set(['__drizzle_migrations', 'd1_migrations', 'sqlite_sequence']);
const tableOrder = [
  'users', 'personal_spaces', 'personal_size_labels', 'organizations', 'organization_members',
  'departments', 'teams', 'projects', 'fronts', 'products', 'processes', 'phases', 'tasks',
  'hierarchy_attachments', 'task_assignees', 'tags', 'task_tags', 'checklist_items', 'task_comments',
  'task_lists', 'task_list_tasks', 'dependency_edges', 'recurrence_series', 'recurrence_occurrences',
  'recurrence_exceptions', 'cyclic_queue_states', 'cyclic_queue_overrides', 'reminders',
  'notification_preferences', 'notifications', 'item_role_assignments', 'item_invitations',
  'owner_transfer_requests', 'item_templates', 'audit_events', 'domain_migration_events',
  'privacy_requests', 'mcp_tokens',
];
const booleanColumns = new Set([
  'projects.approval_required', 'fronts.approval_required', 'products.approval_required',
  'processes.approval_required', 'processes.auto_complete_when_children_done', 'phases.approval_required',
  'tasks.approval_required', 'tasks.pinned_for_today', 'recurrence_series.active',
  'checklist_items.completed', 'notification_preferences.due_soon_enabled',
  'notification_preferences.overdue_enabled', 'notification_preferences.scheduled_enabled',
  'notification_preferences.reminder_enabled',
]);
const quote = (identifier: string) => `"${identifier.replaceAll('"', '""')}"`;
async function main() {
  const input = process.argv[2];
  if (!input) throw new Error('Uso: npm run db:import -- /caminho/para/export.sql|export.sqlite');
  const sourcePath = resolve(input);
  if (!existsSync(sourcePath)) throw new Error(`Exportação D1/SQLite não encontrada: ${sourcePath}`);
  if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL antes de importar.');
  let temporaryDirectory: string | undefined;
  let sqlitePath = sourcePath;
  if (extname(sourcePath).toLowerCase() === '.sql') {
    temporaryDirectory = mkdtempSync(join(tmpdir(), 'taskando-import-'));
    sqlitePath = join(temporaryDirectory, 'source.sqlite');
    const generated = new DatabaseSync(sqlitePath);
    try { generated.exec(readFileSync(sourcePath, 'utf8')); }
    finally { generated.close(); }
  }
  const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });
  const pg = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, ssl: databaseSslOptions() });
  const client = await pg.connect();
  try {
  const [{ schema: destinationSchema }] = (await client.query<{ schema: string }>('SELECT current_schema() AS schema')).rows;
  const discovered = (sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as { name: string }[])
    .map(({ name }) => name).filter((name) => !excludedTables.has(name));
  const sourceTables = [...tableOrder.filter((table) => discovered.includes(table)), ...discovered.filter((table) => !tableOrder.includes(table))];
  const destinationTables = new Set((await client.query<{ table_name: string }>('SELECT table_name FROM information_schema.tables WHERE table_schema = $1', [destinationSchema])).rows.map((row) => row.table_name));
  const unknown = sourceTables.filter((table) => !destinationTables.has(table));
  if (unknown.length) throw new Error(`O destino não reconhece estas tabelas: ${unknown.join(', ')}`);

  await client.query('BEGIN');
  await client.query('SET CONSTRAINTS ALL DEFERRED');
  let total = 0;
  for (const table of sourceTables) {
    const columns = (sqlite.prepare(`PRAGMA table_info(${quote(table)})`).all() as { name: string }[]).map(({ name }) => name);
    const destinationColumns = new Set((await client.query<{ column_name: string }>('SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2', [destinationSchema, table])).rows.map((row) => row.column_name));
    const shared = columns.filter((column) => destinationColumns.has(column));
    if (!shared.length) continue;
    let rows = sqlite.prepare(`SELECT ${shared.map(quote).join(', ')} FROM ${quote(table)}`).all() as Record<string, unknown>[];
    if (table === 'tasks') {
      const pending = [...rows];
      rows = [];
      const inserted = new Set<string>();
      while (pending.length) {
        const before = pending.length;
        for (let index = pending.length - 1; index >= 0; index -= 1) {
          const parent = pending[index].parent_task_id;
          if (parent === null || parent === undefined || inserted.has(String(parent))) {
            const [row] = pending.splice(index, 1);
            rows.push(row);
            inserted.add(String(row.id));
          }
        }
        if (pending.length === before) throw new Error('Há um ciclo ou uma referência inválida entre tarefas e subtarefas.');
      }
    }
    for (const row of rows) {
      const values = shared.map((column) => booleanColumns.has(`${table}.${column}`) && row[column] !== null ? Boolean(row[column]) : row[column]);
      const placeholders = shared.map((_, index) => `$${index + 1}`).join(', ');
      await client.query(`INSERT INTO ${quote(table)} (${shared.map(quote).join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, values);
    }
    total += rows.length;
    console.log(`${table}: ${rows.length}`);
  }
  await client.query('COMMIT');
  console.log(`Importação concluída: ${total} registros processados.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pg.end();
    sqlite.close();
    if (temporaryDirectory) rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

void main();
