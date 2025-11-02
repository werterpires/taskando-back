import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { OrganizationsMembersService } from './organizations-members.service'
import { OrganizationsMembersController } from './organizations-members.controller'
import { OrganizationsMembersRepo } from './organizations-members.repo'
import { OrganizationsMembersHelper } from './organizations-members.helper'
import { OrganizationMember } from './entities/organization-member.entity'
import { User } from '../users/entities/user.entity'
import { Organization } from '../organizations/entities/organization.entity'

const services = [
  OrganizationsMembersService,
  OrganizationsMembersRepo,
  OrganizationsMembersHelper
]

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationMember, User, Organization])],
  controllers: [OrganizationsMembersController],
  providers: services,
  exports: services
})
export class OrganizationsMembersModule {}
