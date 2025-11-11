import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProjectsController } from './projects.controller'
import { ProjectsService } from './projects.service'
import { ProjectsHelper } from './projects.helper'
import { Project } from './entities/project.entity'
import { ProjectMember } from './entities/project-member.entity'
import { OrganizationMember } from '../organizations-members/entities/organization-member.entity'
import { DepartmentMember } from '../departments/entities/department-member.entity'
import { TeamMember } from '../teams/entities/team-member.entity'
import { SquadMember } from '../squads/entities/squad-member.entity'
import { ActivityDomain } from '../activity-domains/entities/activity-domain.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectMember,
      OrganizationMember,
      DepartmentMember,
      TeamMember,
      SquadMember,
      ActivityDomain
    ])
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsHelper],
  exports: [ProjectsService]
})
export class ProjectsModule {}
