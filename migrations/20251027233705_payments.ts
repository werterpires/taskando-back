import type { Knex } from 'knex'
import * as db from '../src/constants/db'
import { createColumn } from '../src/shared/dbFunctions'

export async function up(knex: Knex): Promise<void> {
  const payments = db.payments
  const hasTable = await knex.schema.hasTable(payments.name)
  if (hasTable) return

  await knex.schema.createTable(payments.name, (table) => {
    createColumn(knex, table, payments.columns.id)
    createColumn(knex, table, payments.columns.subscriptionId)
    createColumn(knex, table, payments.columns.amount)
    createColumn(knex, table, payments.columns.date)
    createColumn(knex, table, payments.columns.status)
    createColumn(knex, table, payments.columns.paymentMethod)
    createColumn(knex, table, payments.columns.paymentCode)
    table.timestamps(true, true)
  })
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable(db.payments.name)
  if (!hasTable) return

  await knex.schema.dropTable(db.payments.name)
}
