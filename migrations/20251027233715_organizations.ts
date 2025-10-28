import type { Knex } from 'knex'
import * as db from '../src/constants/db'
import { createColumn } from '../src/shared/dbFunctions'

export async function up(knex: Knex): Promise<void> {
  const organizations = db.organizations
  const hasTable = await knex.schema.hasTable(organizations.name)
  if (hasTable) return

  await knex.schema.createTable(organizations.name, (table) => {
    createColumn(knex, table, organizations.columns.id)
    createColumn(knex, table, organizations.columns.name)
    createColumn(knex, table, organizations.columns.cnpj)
    createColumn(knex, table, organizations.columns.address)
    createColumn(knex, table, organizations.columns.phone)
    createColumn(knex, table, organizations.columns.owner)
    table.timestamps(true, true)
  })
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable(db.organizations.name)
  if (!hasTable) return

  await knex.schema.dropTable(db.organizations.name)
}
