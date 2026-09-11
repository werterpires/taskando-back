import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool, type PoolClient } from 'pg';
import { databaseSslOptions } from '../src/db/ssl';

type Row = Record<string, unknown>;
type ExportTable = { columns?: unknown; row_count?: number; rows?: Row[] };
type TaskandoExport = { complete?: boolean; tables?: Record<string, ExportTable> };

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
const userColumns = new Set([
  'owner_user_id', 'author_user_id', 'approved_by_user_id', 'actor_user_id', 'recipient_user_id',
  'user_id', 'created_by_user_id', 'current_owner_user_id', 'proposed_owner_user_id', 'requested_by_user_id',
]);
const booleanColumns = new Set([
  'projects.approval_required', 'fronts.approval_required', 'products.approval_required',
  'processes.approval_required', 'processes.auto_complete_when_children_done', 'phases.approval_required',
  'tasks.approval_required', 'tasks.pinned_for_today', 'recurrence_series.active',
  'checklist_items.completed', 'notification_preferences.due_soon_enabled',
  'notification_preferences.overdue_enabled', 'notification_preferences.scheduled_enabled',
  'notification_preferences.reminder_enabled',
]);
const preservedTables = new Set(['mcp_tokens']);
const quote = (identifier: string) => `"${identifier.replaceAll('"', '""')}"`;
const normalizeEmail = (value: unknown) => String(value ?? '').trim().toLowerCase();

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function insert(client: PoolClient, table: string, row: Row, columns: string[]) {
  const selected = columns.filter((column) => Object.hasOwn(row, column));
  if (!selected.length) return 0;
  const placeholders = selected.map((_, index) => `$${index + 1}`).join(', ');
  const result = await client.query(
    `INSERT INTO ${quote(table)} (${selected.map(quote).join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
    selected.map((column) => row[column]),
  );
  return result.rowCount ?? 0;
}

function orderedRows(table: string, rows: Row[]) {
  if (table !== 'tasks') return rows;
  const pending = [...rows];
  const ordered: Row[] = [];
  const inserted = new Set<string>();
  while (pending.length) {
    const before = pending.length;
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      const parent = pending[index].parent_task_id;
      if (parent === null || parent === undefined || inserted.has(String(parent))) {
        const [row] = pending.splice(index, 1);
        ordered.push(row);
        inserted.add(String(row.id));
      }
    }
    if (pending.length === before) throw new Error('Há um ciclo ou referência inválida entre tarefas e subtarefas.');
  }
  return ordered;
}

async function main() {
  const input = process.argv[2];
  const targetUserId = argument('--user-id');
  const targetEmail = normalizeEmail(argument('--email'));
  const dryRun = process.argv.includes('--dry-run');
  if (!input || !targetUserId || !targetEmail) {
    throw new Error('Uso: npm run db:import-json -- arquivo.json --user-id UUID --email usuario@exemplo.com [--dry-run]');
  }
  const sourcePath = resolve(input);
  if (!existsSync(sourcePath)) throw new Error(`Exportação JSON não encontrada: ${sourcePath}`);
  if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL antes de importar.');

  const exported = JSON.parse(readFileSync(sourcePath, 'utf8')) as TaskandoExport;
  if (!exported.complete || !exported.tables) throw new Error('A exportação JSON está incompleta ou possui formato inválido.');
  const sourceUsers = exported.tables.users?.rows ?? [];
  const sourceUser = sourceUsers.find((row) => normalizeEmail(row.email) === targetEmail);
  if (!sourceUser?.id) throw new Error(`O arquivo não contém o usuário ${targetEmail}.`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, ssl: databaseSslOptions() });
  const client = await pool.connect();
  try {
    const target = await client.query<{ id: string; email: string }>('SELECT id, email FROM users WHERE id = $1', [targetUserId]);
    if (target.rowCount !== 1 || normalizeEmail(target.rows[0].email) !== targetEmail) {
      throw new Error('O ID e o e-mail informados não correspondem ao mesmo usuário no banco de destino.');
    }
    const [{ schema }] = (await client.query<{ schema: string }>('SELECT current_schema() AS schema')).rows;
    const columnRows = await client.query<{ table_name: string; column_name: string }>(
      'SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = $1', [schema],
    );
    const destinationColumns = new Map<string, string[]>();
    for (const row of columnRows.rows) {
      const columns = destinationColumns.get(row.table_name) ?? [];
      columns.push(row.column_name);
      destinationColumns.set(row.table_name, columns);
    }
    const unknown = Object.keys(exported.tables).filter((table) => !destinationColumns.has(table));
    if (unknown.length) throw new Error(`O destino não reconhece estas tabelas: ${unknown.join(', ')}`);

    await client.query('BEGIN');
    const userMap = new Map<string, string>([[String(sourceUser.id), targetUserId]]);
    let inserted = 0;
    let skipped = 0;

    for (const row of sourceUsers) {
      const sourceId = String(row.id);
      if (userMap.has(sourceId)) { skipped += 1; continue; }
      const existing = await client.query<{ id: string }>(
        'SELECT id FROM users WHERE id = $1 OR lower(email) = lower($2)', [sourceId, String(row.email)],
      );
      if (existing.rowCount && existing.rows.some(({ id }) => id !== existing.rows[0].id)) {
        throw new Error(`Conflito entre ID e e-mail ao importar ${String(row.email)}.`);
      }
      const destinationId = existing.rows[0]?.id ?? sourceId;
      userMap.set(sourceId, destinationId);
      if (!existing.rowCount) inserted += await insert(client, 'users', row, destinationColumns.get('users') ?? []);
      else skipped += 1;
    }

    const targetSpace = await client.query<{ id: string }>('SELECT id FROM personal_spaces WHERE owner_user_id = $1', [targetUserId]);
    if (targetSpace.rowCount !== 1) throw new Error('O usuário-alvo não possui exatamente um espaço pessoal no destino.');
    const personalSpaceMap = new Map<string, string>();
    for (const row of exported.tables.personal_spaces?.rows ?? []) {
      const sourceId = String(row.id);
      const mappedOwner = userMap.get(String(row.owner_user_id)) ?? String(row.owner_user_id);
      const existing = await client.query<{ id: string }>('SELECT id FROM personal_spaces WHERE owner_user_id = $1', [mappedOwner]);
      if (existing.rowCount) {
        personalSpaceMap.set(sourceId, existing.rows[0].id);
        skipped += 1;
        continue;
      }
      const mapped = { ...row, owner_user_id: mappedOwner };
      const created = await insert(client, 'personal_spaces', mapped, destinationColumns.get('personal_spaces') ?? []);
      if (!created) throw new Error(`Não foi possível importar o espaço pessoal ${sourceId}.`);
      personalSpaceMap.set(sourceId, sourceId);
      inserted += created;
    }

    const sourcePrimarySpace = (exported.tables.personal_spaces?.rows ?? [])
      .find((row) => String(row.owner_user_id) === String(sourceUser.id));
    if (!sourcePrimarySpace?.id) throw new Error('O usuário de origem não possui espaço pessoal na exportação.');
    personalSpaceMap.set(String(sourcePrimarySpace.id), targetSpace.rows[0].id);

    const hasPreferences = (exported.tables.notification_preferences?.rows ?? [])
      .some((row) => String(row.user_id) === String(sourceUser.id));
    if (hasPreferences) await client.query('DELETE FROM notification_preferences WHERE user_id = $1', [targetUserId]);
    const hasQueueState = (exported.tables.cyclic_queue_states?.rows ?? [])
      .some((row) => String(row.personal_space_id) === String(sourcePrimarySpace.id));
    if (hasQueueState) await client.query('DELETE FROM cyclic_queue_states WHERE personal_space_id = $1', [targetSpace.rows[0].id]);

    for (const table of tableOrder) {
      if (['users', 'personal_spaces'].includes(table)) continue;
      const rows = exported.tables[table]?.rows ?? [];
      if (preservedTables.has(table)) {
        skipped += rows.length;
        console.log(`${table}: ${rows.length} preservados no destino`);
        continue;
      }
      const columns = destinationColumns.get(table) ?? [];
      let tableInserted = 0;
      for (const sourceRow of orderedRows(table, rows)) {
        const row: Row = { ...sourceRow };
        for (const column of columns) {
          if (row[column] === null || row[column] === undefined) continue;
          if (userColumns.has(column)) row[column] = userMap.get(String(row[column])) ?? row[column];
          if (column === 'personal_space_id') row[column] = personalSpaceMap.get(String(row[column])) ?? row[column];
          if (booleanColumns.has(`${table}.${column}`)) row[column] = row[column] === true || row[column] === 1 || row[column] === '1';
        }
        const created = await insert(client, table, row, columns);
        tableInserted += created;
        skipped += created ? 0 : 1;
      }
      inserted += tableInserted;
      console.log(`${table}: ${tableInserted}/${rows.length} inseridos`);
    }

    if (dryRun) {
      await client.query('ROLLBACK');
      console.log(`Simulação concluída e revertida: ${inserted} inserções; ${skipped} registros preservados ou já existentes.`);
    } else {
      await client.query('COMMIT');
      console.log(`Importação concluída: ${inserted} inserções; ${skipped} registros preservados ou já existentes.`);
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
