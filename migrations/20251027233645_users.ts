import type { Knex } from 'knex'
import * as db from '../src/constants/db'
import { createColumn } from '../src/shared/dbFunctions'
import * as bcrypt from 'bcrypt'

export async function up(knex: Knex): Promise<void> {
  const users = db.users
  const hasTable = await knex.schema.hasTable(users.name)
  if (hasTable) return

  await knex.schema.createTable(users.name, (table) => {
    createColumn(knex, table, users.columns.id)
    createColumn(knex, table, users.columns.email)
    createColumn(knex, table, users.columns.password)
    createColumn(knex, table, users.columns.firstName)
    createColumn(knex, table, users.columns.lastName)
    createColumn(knex, table, users.columns.inviteCode)
    table.timestamps(true, true)
  })

  // Seed a basic user with a simple 8-character password (lowercase, uppercase, number, symbol)
  const plainPassword = 'Aa1234!@'
  const hashedPassword = await bcrypt.hash(plainPassword, 12)

  await knex(users.name).insert({
    email: 'user@example.com',
    password: hashedPassword
  })
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable(db.users.name)
  if (!hasTable) return

  await knex.schema.dropTable(db.users.name)
}
