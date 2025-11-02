import { Module } from '@nestjs/common'
import { UsersService } from './users.service'
import { UsersController } from './users.controller'
import { UsersHelper } from './users.helper'

import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from './entities/user.entity'

const services = [UsersService, UsersHelper]

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: services
})
export class UsersModule {}
