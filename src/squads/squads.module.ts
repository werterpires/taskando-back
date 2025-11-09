import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SquadsService } from './squads.service'
import { SquadsController } from './squads.controller'
import { SquadsHelper } from './squads.helper'
import { Squad } from './entities/squad.entity'
import { SquadMember } from './entities/squad-member.entity'
import { Organization } from '../organizations/entities/organization.entity'
import { Department } from '../departments/entities/department.entity'
import { Team } from '../teams/entities/team.entity'
import { OrganizationMember } from '../organizations-members/entities/organization-member.entity'
import { DepartmentMember } from '../departments/entities/department-member.entity'
import { TeamMember } from '../teams/entities/team-member.entity'

const services = [SquadsService, SquadsHelper]

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Squad,
      SquadMember,
      Organization,
      Department,
      Team,
      OrganizationMember,
      DepartmentMember,
      TeamMember
    ])
  ],
  controllers: [SquadsController],
  providers: services,
  exports: services
})
export class SquadsModule {}
