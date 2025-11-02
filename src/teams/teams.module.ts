import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TeamsService } from './teams.service'
import { TeamsController } from './teams.controller'
import { TeamsRepo } from './teams.repo'
import { TeamsHelper } from './teams.helper'
import { Team } from './entities/team.entity'
import { TeamMember } from './entities/team-member.entity'
import { Organization } from '../organizations/entities/organization.entity'
import { Department } from '../departments/entities/department.entity'
import { OrganizationMember } from '../organizations-members/entities/organization-member.entity'
import { DepartmentMember } from '../departments/entities/department-member.entity'

const services = [TeamsService, TeamsRepo, TeamsHelper]

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Team,
      TeamMember,
      Organization,
      Department,
      OrganizationMember,
      DepartmentMember
    ])
  ],
  controllers: [TeamsController],
  providers: services,
  exports: services
})
export class TeamsModule {}
