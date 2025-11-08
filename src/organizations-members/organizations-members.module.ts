import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Organization } from '../organizations/entities/organization.entity'
import { User } from '../users/entities/user.entity'
import { OrganizationMember } from './entities/organization-member.entity'
import { OrganizationsMembersController } from './organizations-members.controller'
import { OrganizationsMembersHelper } from './organizations-members.helper'
import { OrganizationsMembersService } from './organizations-members.service'

const services = [OrganizationsMembersService, OrganizationsMembersHelper]

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationMember, User, Organization])],
  controllers: [OrganizationsMembersController],
  providers: services,
  exports: services
})
export class OrganizationsMembersModule {}
