import { Module } from '@nestjs/common'
import { DepartmentsService } from './departments.service'
import { DepartmentsController } from './departments.controller'
import { DepartmentsRepo } from './departments.repo'
import { DepartmentsHelper } from './departments.helper'
import { TeamsModule } from '../teams/teams.module'

const services = [DepartmentsService, DepartmentsRepo, DepartmentsHelper]

@Module({
  imports: [TeamsModule],
  controllers: [DepartmentsController],
  providers: services,
  exports: services
})
export class DepartmentsModule {}
