import { Injectable } from '@nestjs/common'
import { CreateUserDto } from './dto/create-user.dto'
import * as bcrypt from 'bcrypt'
import { UpdateUserDto } from './dto/update-user.dto'

@Injectable()
export class UsersHelper {
  makeCreateUserDataFromDto(createUserDto: CreateUserDto) {
    return {
      email: createUserDto.email,
      password: bcrypt.hashSync(createUserDto.password, 10),
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName
    }
  }

  makeUserFromDto(updateUserDto: UpdateUserDto) {
    return {
      id: updateUserDto.id,
      email: updateUserDto.email,
      password: bcrypt.hashSync(updateUserDto.password, 10),
      firstName: updateUserDto.firstName,
      lastName: updateUserDto.lastName
    }
  }
}
