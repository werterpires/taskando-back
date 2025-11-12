import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProcessesController } from './processes.controller'
import { ProcessesService } from './processes.service'
import { ProcessesHelper } from './processes.helper'
import { Process } from './entities/process.entity'
import { ProcessMember } from './entities/process-member.entity'
import { OrganizationMember } from '../organizations-members/entities/organization-member.entity'
import { DepartmentMember } from '../departments/entities/department-member.entity'
import { TeamMember } from '../teams/entities/team-member.entity'
import { SquadMember } from '../squads/entities/squad-member.entity'
import { ProductMember } from '../products/entities/product-member.entity'
import { ProjectMember } from '../projects/entities/project-member.entity'
import { ActivityDomain } from '../activity-domains/entities/activity-domain.entity'
import { Product } from '../products/entities/product.entity'
import { Stream } from '../streams/entities/stream.entity'
import { Project } from '../projects/entities/project.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Process,
      ProcessMember,
      OrganizationMember,
      DepartmentMember,
      TeamMember,
      SquadMember,
      ProductMember,
      ProjectMember,
      ActivityDomain,
      Product,
      Stream,
      Project
    ])
  ],
  controllers: [ProcessesController],
  providers: [ProcessesService, ProcessesHelper],
  exports: [ProcessesService]
})
export class ProcessesModule {}
