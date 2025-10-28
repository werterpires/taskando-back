import type { Knex } from 'knex'
import * as db from '../src/constants/db'
import { createColumn } from '../src/shared/dbFunctions'

export async function up(knex: Knex): Promise<void> {
  const departmentMembers = db.departmentMembers
  const hasTable = await knex.schema.hasTable(departmentMembers.name)
  if (hasTable) return

  await knex.schema.createTable(departmentMembers.name, (table) => {
    createColumn(knex, table, departmentMembers.columns.userId)
    createColumn(knex, table, departmentMembers.columns.departmentId)
    createColumn(knex, table, departmentMembers.columns.role)
    createColumn(knex, table, departmentMembers.columns.active)
    table.primary([
      departmentMembers.columns.userId.name,
      departmentMembers.columns.departmentId.name
    ])
    table.timestamps(true, true)
  })
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable(db.departmentMembers.name)
  if (!hasTable) return

  await knex.schema.dropTable(db.departmentMembers.name)
}
