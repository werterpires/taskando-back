import { Injectable } from '@nestjs/common'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { InjectConnection } from 'nest-knexjs'
import { Knex } from 'knex'
import { CreateUserData, User } from './types'
import { users } from '../constants/db'

@Injectable()
export class UsersRepo {
  private columns = users.columns
  constructor(@InjectConnection('knexx') private readonly knex: Knex) {}

  async createUser(createUserDto: CreateUserData) {
    return await this.knex(users.name).insert(createUserDto)
  }

  async updateUser(user: User) {
    return await this.knex(users.name)
      .where(this.columns.id.completeName, user.userId)
      .update({ ...user, updated_at: new Date() })
  }

  async removeUser(userId: number) {
    return await this.knex(users.name)
      .where(this.columns.id.completeName, userId)
      .delete()
  }
}
