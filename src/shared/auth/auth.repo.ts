import { Injectable } from '@nestjs/common'
import { Knex } from 'knex'
import { InjectConnection } from 'nest-knexjs'

import { ValidateUser as ValidateUser } from './types'
import { users } from '../../constants/db'

@Injectable()
export class AuthRepo {
  private users = users
  private usersColumns = users.columns

  constructor(@InjectConnection('knexx') private readonly knex: Knex) {}

  async findUserByEmailForLogin(
    email: string
  ): Promise<ValidateUser | undefined> {
    const user = await this.knex<ValidateUser>(users.name)
      .table(users.name)
      .where(this.usersColumns.email.completeName, email)
      .first()

    return user as ValidateUser
  }
}
