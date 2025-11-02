import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { ValidateUser as ValidateUser } from './types'
import { User } from '../../users/entities/user.entity'

@Injectable()
export class AuthRepo {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async findUserByEmailForLogin(
    email: string
  ): Promise<ValidateUser | undefined> {
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'firstName', 'lastName', 'isActive']
    })

    if (!user) {
      return undefined
    }

    return {
      userId: user.id,
      email: user.email,
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName
    } as ValidateUser
  }
}
