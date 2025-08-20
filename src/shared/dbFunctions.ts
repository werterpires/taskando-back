import { Knex } from 'knex'

import { DbTable } from 'src/constants/db'

export async function generateTable(knex: Knex, table: DbTable) {
  const columns = Object.values(table.columns)

  if (!(await knex.schema.hasTable(table.name))) {
    await knex.schema.createTable(table.name, (table) => {
      for (const column of columns) {
        let columnBuilder: Knex.ColumnBuilder | null = null

        if (column.primary) {
          columnBuilder = table.increments(column.name).primary()
        } else if (column.type === 'string') {
          columnBuilder = table.string(column.name, column.length || 255)
        } else if (column.type === 'number') {
          columnBuilder = table.integer(column.name)
        } else if (column.type === 'boolean') {
          columnBuilder = table.boolean(column.name)
        } else if (column.type === 'date') {
          columnBuilder = table.date(column.name)
        } else if (column.type === 'time') {
          columnBuilder = table.time(column.name)
        } else if (column.type === 'timestamp') {
          columnBuilder = table.timestamp(column.name)
        } else if (column.type === 'text') {
          columnBuilder = table.text(column.name)
        } else if (column.type === 'json') {
          columnBuilder = table.json(column.name)
        } else if (column.type === 'uuid') {
          columnBuilder = table.uuid(column.name)
        } else if (column.type === 'binary') {
          columnBuilder = table.binary(column.name)
        } else if (column.type === 'decimal') {
          columnBuilder = table.decimal(column.name, 10, 2)
        }

        if (columnBuilder) {
          if (column.nullable) {
            columnBuilder.nullable()
          } else {
            columnBuilder.notNullable()
          }
          if (column.unique) {
            columnBuilder.unique()
          }
          if (column.default !== undefined) {
            columnBuilder.defaultTo(column.default)
          }

          if (column.foreignKey) {
            columnBuilder
              .unsigned()
              .references(column.foreignKey.column)
              .inTable(column.foreignKey.table)
              .onDelete(column.foreignKey.onDelete || 'CASCADE')
              .onUpdate(column.foreignKey.onUpdate || 'CASCADE')
          }
        }
      }
      table.timestamps(true, true)
    })
  }
}

export async function dropTable(knex: Knex, table: DbTable) {
  if (await knex.schema.hasTable(table.name)) {
    await knex.schema.dropTable(table.name)
  }
}

export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, (letter) => `_${letter.toLowerCase()}`)
    .replace(/^_/, '')
}
