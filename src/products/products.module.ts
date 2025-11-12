import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProductsController } from './products.controller'
import { ProductsService } from './products.service'
import { ProductsHelper } from './products.helper'
import { Product } from './entities/product.entity'
import { ProductMember } from './entities/product-member.entity'
import { OrganizationMember } from '../organizations-members/entities/organization-member.entity'
import { DepartmentMember } from '../departments/entities/department-member.entity'
import { TeamMember } from '../teams/entities/team-member.entity'
import { SquadMember } from '../squads/entities/squad-member.entity'
import { ProjectMember } from '../projects/entities/project-member.entity'
import { ActivityDomain } from '../activity-domains/entities/activity-domain.entity'
import { Project } from '../projects/entities/project.entity'
import { Stream } from '../streams/entities/stream.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductMember,
      OrganizationMember,
      DepartmentMember,
      TeamMember,
      SquadMember,
      ProjectMember,
      ActivityDomain,
      Project,
      Stream
    ])
  ],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsHelper],
  exports: [ProductsService]
})
export class ProductsModule {}
