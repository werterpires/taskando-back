import type { Knex } from 'knex'
import * as db from '../src/constants/db'
import { createColumn } from '../src/shared/dbFunctions'

export async function up(knex: Knex): Promise<void> {
  const teams = db.teams
  const hasTable = await knex.schema.hasTable(teams.name)
  if (hasTable) return

  await knex.schema.createTable(teams.name, (table) => {
    createColumn(knex, table, teams.columns.id)
    createColumn(knex, table, teams.columns.name)
    createColumn(knex, table, teams.columns.department)
    createColumn(knex, table, teams.columns.organization)
    createColumn(knex, table, teams.columns.owner)
    table.timestamps(true, true)
  })
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable(db.teams.name)
  if (!hasTable) return

  await knex.schema.dropTable(db.teams.name)
}
