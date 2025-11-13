import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TasksController } from './tasks.controller'
import { TasksService } from './tasks.service'
import { TasksHelper } from './tasks.helper'
import { Task } from './entities/task.entity'
import { TaskMember } from './entities/task-member.entity'
import { OrganizationMember } from '../organizations-members/entities/organization-member.entity'
import { DepartmentMember } from '../departments/entities/department-member.entity'
import { TeamMember } from '../teams/entities/team-member.entity'
import { SquadMember } from '../squads/entities/squad-member.entity'
import { ProjectMember } from '../projects/entities/project-member.entity'
import { ProductMember } from '../products/entities/product-member.entity'
import { ProcessMember } from '../processes/entities/process-member.entity'
import { PhaseMember } from '../phases/entities/phase-member.entity'
import { ActivityDomain } from '../activity-domains/entities/activity-domain.entity'
import { Stream } from '../streams/entities/stream.entity'
import { Product } from '../products/entities/product.entity'
import { Process } from '../processes/entities/process.entity'
import { Phase } from '../phases/entities/phase.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      TaskMember,
      OrganizationMember,
      DepartmentMember,
      TeamMember,
      SquadMember,
      ProjectMember,
      ProductMember,
      ProcessMember,
      PhaseMember,
      ActivityDomain,
      Stream,
      Product,
      Process,
      Phase
    ])
  ],
  controllers: [TasksController],
  providers: [TasksService, TasksHelper],
  exports: [TasksService]
})
export class TasksModule {}
