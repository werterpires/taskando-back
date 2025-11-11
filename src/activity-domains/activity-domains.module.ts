import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ActivityDomainsService } from './activity-domains.service'
import { ActivityDomainsController } from './activity-domains.controller'
import { ActivityDomainsHelper } from './activity-domains.helper'
import { ActivityDomain } from './entities/activity-domain.entity'
import { ActivityDomainMember } from './entities/activity-domain-member.entity'
import { Organization } from '../organizations/entities/organization.entity'
import { Department } from '../departments/entities/department.entity'
import { Team } from '../teams/entities/team.entity'
import { Squad } from '../squads/entities/squad.entity'
import { OrganizationMember } from '../organizations-members/entities/organization-member.entity'
import { DepartmentMember } from '../departments/entities/department-member.entity'
import { TeamMember } from '../teams/entities/team-member.entity'
import { SquadMember } from '../squads/entities/squad-member.entity'

const services = [ActivityDomainsService, ActivityDomainsHelper]

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ActivityDomain,
      ActivityDomainMember,
      Organization,
      Department,
      Team,
      Squad,
      OrganizationMember,
      DepartmentMember,
      TeamMember,
      SquadMember
    ])
  ],
  controllers: [ActivityDomainsController],
  providers: services,
  exports: services
})
export class ActivityDomainsModule {}
