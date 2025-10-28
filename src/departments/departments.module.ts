import { Module } from '@nestjs/common'
import { DepartmentsService } from './departments.service'
import { DepartmentsController } from './departments.controller'
import { DepartmentsRepo } from './departments.repo'
import { DepartmentsHelper } from './departments.helper'

const services = [DepartmentsService, DepartmentsRepo, DepartmentsHelper]

@Module({
  controllers: [DepartmentsController],
  providers: services,
  exports: services
})
export class DepartmentsModule {}
