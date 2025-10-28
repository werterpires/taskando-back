import type { Knex } from 'knex'
import * as db from '../src/constants/db'
import { createColumn } from '../src/shared/dbFunctions'

export async function up(knex: Knex): Promise<void> {
  const organizationMembers = db.organizationMembers
  const hasTable = await knex.schema.hasTable(organizationMembers.name)
  if (hasTable) return

  await knex.schema.createTable(organizationMembers.name, (table) => {
    createColumn(knex, table, organizationMembers.columns.userId)
    createColumn(knex, table, organizationMembers.columns.orgId)
    createColumn(knex, table, organizationMembers.columns.role)
    createColumn(knex, table, organizationMembers.columns.active)
    table.timestamps(true, true)
  })
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable(db.organizationMembers.name)
  if (!hasTable) return

  await knex.schema.dropTable(db.organizationMembers.name)
}
