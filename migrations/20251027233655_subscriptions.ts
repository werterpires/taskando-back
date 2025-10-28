import type { Knex } from 'knex'
import * as db from '../src/constants/db'
import { createColumn } from '../src/shared/dbFunctions'

export async function up(knex: Knex): Promise<void> {
  const subscriptions = db.subscriptions
  const hasTable = await knex.schema.hasTable(subscriptions.name)
  if (hasTable) return

  await knex.schema.createTable(subscriptions.name, (table) => {
    createColumn(knex, table, subscriptions.columns.id)
    createColumn(knex, table, subscriptions.columns.userId)
    createColumn(knex, table, subscriptions.columns.plan)
    createColumn(knex, table, subscriptions.columns.startDate)
    createColumn(knex, table, subscriptions.columns.endDate)
    createColumn(knex, table, subscriptions.columns.status)
    createColumn(knex, table, subscriptions.columns.date)
    table.timestamps(true, true)
  })
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable(db.subscriptions.name)
  if (!hasTable) return

  await knex.schema.dropTable(db.subscriptions.name)
}
