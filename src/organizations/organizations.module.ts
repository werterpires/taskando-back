import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DepartmentsModule } from '../departments/departments.module'
import { TeamsModule } from '../teams/teams.module'
import { OrganizationsService } from './organizations.service'
import { OrganizationsController } from './organizations.controller'
import { Organization } from './entities/organization.entity'
import { OrganizationMember } from '../organizations-members/entities/organization-member.entity'

const services = [OrganizationsService]

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, OrganizationMember]),
    DepartmentsModule,
    TeamsModule
  ],
  controllers: [OrganizationsController],
  providers: services,
  exports: services
})
export class OrganizationsModule {}
