import type { Knex } from 'knex'
import * as db from '../src/constants/db'
import { createColumn } from '../src/shared/dbFunctions'

export async function up(knex: Knex): Promise<void> {
  const teamMembers = db.teamMembers
  const hasTable = await knex.schema.hasTable(teamMembers.name)
  if (hasTable) return

  await knex.schema.createTable(teamMembers.name, (table) => {
    createColumn(knex, table, teamMembers.columns.userId)
    createColumn(knex, table, teamMembers.columns.teamId)
    createColumn(knex, table, teamMembers.columns.role)
    createColumn(knex, table, teamMembers.columns.active)
    table.timestamps(true, true)
    table.primary(['userId', 'teamId'])
  })
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable(db.teamMembers.name)
  if (!hasTable) return

  await knex.schema.dropTable(db.teamMembers.name)
}
