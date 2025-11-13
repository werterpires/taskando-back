import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CyclesController } from './cycles.controller'
import { CyclesService } from './cycles.service'
import { CyclesHelper } from './cycles.helper'
import { Cycle } from './entities/cycle.entity'
import { CycleParameter } from './entities/cycle-parameter.entity'
import { CycleMember } from './entities/cycle-member.entity'
import { OrganizationMember } from '../organizations-members/entities/organization-member.entity'
import { DepartmentMember } from '../departments/entities/department-member.entity'
import { TeamMember } from '../teams/entities/team-member.entity'
import { SquadMember } from '../squads/entities/squad-member.entity'
import { ProjectMember } from '../projects/entities/project-member.entity'
import { ProductMember } from '../products/entities/product-member.entity'
import { ProcessMember } from '../processes/entities/process-member.entity'
import { ActivityDomain } from '../activity-domains/entities/activity-domain.entity'
import { Stream } from '../streams/entities/stream.entity'
import { Product } from '../products/entities/product.entity'
import { Process } from '../processes/entities/process.entity'
import { Phase } from '../phases/entities/phase.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cycle,
      CycleParameter,
      CycleMember,
      OrganizationMember,
      DepartmentMember,
      TeamMember,
      SquadMember,
      ProjectMember,
      ProductMember,
      ProcessMember,
      ActivityDomain,
      Stream,
      Product,
      Process,
      Phase
    ])
  ],
  controllers: [CyclesController],
  providers: [CyclesService, CyclesHelper],
  exports: [CyclesService]
})
export class CyclesModule {}
