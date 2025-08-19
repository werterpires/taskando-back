/* eslint-disable @typescript-eslint/no-unsafe-return */

import type { Knex } from 'knex'
import * as dotenv from 'dotenv'
import camelcaseKeys from 'camelcase-keys'
dotenv.config()

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, (letter) => `_${letter.toLowerCase()}`)
    .replace(/^_/, '')
}

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASS,
      database: process.env.SQL_DB,
      port: 3306
    },
    wrapIdentifier: (value, origImpl) => origImpl(toSnakeCase(value)),
    postProcessResponse: (result) => {
      if (Array.isArray(result)) {
        return result.map((row) => camelcaseKeys(row, { deep: true }))
      }
      return camelcaseKeys(result, { deep: true })
    }
  },

  staging: {
    client: 'postgresql',
    connection: {
      database: 'my_db',
      user: 'username',
      password: 'password'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },

  production: {
    client: 'postgresql',
    connection: {
      database: 'my_db',
      user: 'username',
      password: 'password'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }
}

module.exports = config
