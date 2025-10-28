import { Injectable } from '@nestjs/common'
import { InjectConnection } from 'nest-knexjs'
import { Knex } from 'knex'
import { users } from '../constants/db'

@Injectable()
export class UsersRepo {
  private columns = users.columns
  constructor(@InjectConnection('knexx') private readonly knex: Knex) {}
}
