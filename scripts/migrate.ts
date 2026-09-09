import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getDb, pool } from '../src/db';

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL antes de executar as migrations.');
  try {
    await migrate(await getDb(), { migrationsFolder: './drizzle' });
    console.log('Migrations PostgreSQL aplicadas.');
  } finally {
    await pool.end();
  }
}

void main();
