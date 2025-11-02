import { Injectable } from '@nestjs/common'
import { UsersHelper } from './users.helper'
import { InjectRepository } from '@nestjs/typeorm'
import { User } from './entities/user.entity'
import { Repository } from 'typeorm'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    private readonly usersHelper: UsersHelper
  ) {}

  //find all com paginação de 20
  findAll(page: number): Promise<User[]> {
    const take = 20
    const skip = (page - 1) * take
    return this.usersRepo.find({ take, skip })
  }

  //find by id
  findById(id: number): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } })
  }
}
