import type { Knex } from 'knex'
import * as db from '../src/constants/db'
import { createColumn } from '../src/shared/dbFunctions'

export async function up(knex: Knex): Promise<void> {
  const departments = db.departments
  const hasTable = await knex.schema.hasTable(departments.name)
  if (hasTable) return

  await knex.schema.createTable(departments.name, (table) => {
    createColumn(knex, table, departments.columns.id)
    createColumn(knex, table, departments.columns.name)
    createColumn(knex, table, departments.columns.organization)
    createColumn(knex, table, departments.columns.owner)
    table.timestamps(true, true)
  })
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable(db.departments.name)
  if (!hasTable) return

  await knex.schema.dropTable(db.departments.name)
}
