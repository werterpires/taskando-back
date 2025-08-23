/* eslint-disable @typescript-eslint/no-unsafe-return */

import type { Knex } from 'knex'
import * as dotenv from 'dotenv'
import camelcaseKeys from 'camelcase-keys'
import { toSnakeCase } from './src/shared/dbFunctions'

dotenv.config()

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
    },
    log: {
      warn(message) {
        console.warn('Knex warn:', message)
      },
      error(message) {
        console.error('Knex error:', message)
      },
      deprecate(message) {
        console.log('Knex deprecated:', message)
      },
      debug(message) {
        console.debug('Knex debug:', message)
      }
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
