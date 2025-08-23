import type { Knex } from 'knex'
import { dbTables } from '../src/constants/db'
import { generateTable, dropTable } from '../src/shared/dbFunctions'

export async function up(knex: Knex): Promise<void> {
  for (const table of dbTables) {
    await generateTable(knex, table)
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const table of dbTables.reverse()) {
    await dropTable(knex, table)
  }
}
