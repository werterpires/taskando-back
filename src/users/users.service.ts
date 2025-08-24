import { Injectable } from '@nestjs/common'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { UsersRepo } from './users.repo'
import { UsersHelper } from './users.helper'

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepo: UsersRepo,
    private readonly usersHelper: UsersHelper
  ) {}

  async create(createUserDto: CreateUserDto) {
    const createUserData =
      this.usersHelper.makeCreateUserDataFromDto(createUserDto)
    return await this.usersRepo.createUser(createUserData)
  }

  async update(updateUserDto: UpdateUserDto) {
    const user = this.usersHelper.makeUserFromDto(updateUserDto)
    return await this.usersRepo.updateUser(user)
  }

  async remove(id: number) {
    return await this.usersRepo.removeUser(id)
  }
}
