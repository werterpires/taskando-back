import { AsyncLocalStorage } from 'node:async_hooks';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolClient } from 'pg';
import * as schema from './schema';
export const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
function connect(client: Pool | PoolClient) {
  const db = drizzle(client, { schema });
  return Object.assign(db, {
    async batch(statements: { execute(): Promise<unknown> }[]) {
      const results: unknown[] = [];
      for (const statement of statements) results.push(await statement.execute());
      return results;
    },
    run: db.execute.bind(db),
  });
}
export type Database = ReturnType<typeof connect>;
const connection = new AsyncLocalStorage<Database>();
const defaultDb = connect(pool);
export async function getDb(): Promise<Database> { return connection.getStore() ?? defaultDb; }
export function withDatabase<T>(db: Database, operation: () => Promise<T>) { return connection.run(db, operation); }
export async function transaction<T>(operation: () => Promise<T>, serialize = true): Promise<T> {
  if (connection.getStore()) return operation();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout = '30s'");
    // Preserve the original single-writer invariants across API instances while allowing concurrent reads.
    if (serialize) await client.query('SELECT pg_advisory_xact_lock(74201901)');
    const result = await withDatabase(connect(client), operation);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
