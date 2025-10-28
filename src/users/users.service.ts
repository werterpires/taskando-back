import { Injectable } from '@nestjs/common'
import { UsersHelper } from './users.helper'
import { UsersRepo } from './users.repo'

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepo: UsersRepo,
    private readonly usersHelper: UsersHelper
  ) {}
}
