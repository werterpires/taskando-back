import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DepartmentsService } from './departments.service'
import { DepartmentsController } from './departments.controller'
import { DepartmentsHelper } from './departments.helper'
import { TeamsModule } from '../teams/teams.module'
import { Department } from './entities/department.entity'
import { DepartmentMember } from './entities/department-member.entity'
import { Organization } from '../organizations/entities/organization.entity'
import { OrganizationMember } from '../organizations-members/entities/organization-member.entity'

const services = [DepartmentsService, DepartmentsHelper]

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Department,
      DepartmentMember,
      Organization,
      OrganizationMember
    ]),
    TeamsModule
  ],
  controllers: [DepartmentsController],
  providers: services,
  exports: services
})
export class DepartmentsModule {}
