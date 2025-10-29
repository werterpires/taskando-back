import { Module } from '@nestjs/common'
import { TeamsService } from './teams.service'
import { TeamsController } from './teams.controller'
import { TeamsRepo } from './teams.repo'
import { TeamsHelper } from './teams.helper'

const services = [TeamsService, TeamsRepo, TeamsHelper]

@Module({
  controllers: [TeamsController],
  providers: services,
  exports: services
})
export class TeamsModule {}
