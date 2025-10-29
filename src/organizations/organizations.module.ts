import { Module } from '@nestjs/common'
import { DepartmentsModule } from '../departments/departments.module'
import { TeamsModule } from '../teams/teams.module'
import { OrganizationsService } from './organizations.service'
import { OrganizationsController } from './organizations.controller'
import { OrganizationsRepo } from './organizations.repo'
import { OrganizationsHelper } from './organizations.helper'

const services = [OrganizationsService, OrganizationsRepo, OrganizationsHelper]

@Module({
  imports: [DepartmentsModule, TeamsModule],
  controllers: [OrganizationsController],
  providers: services,
  exports: services
})
export class OrganizationsModule {}
