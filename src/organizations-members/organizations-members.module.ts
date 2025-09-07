
import { Module } from '@nestjs/common'
import { OrganizationsMembersService } from './organizations-members.service'
import { OrganizationsMembersController } from './organizations-members.controller'
import { OrganizationsMembersRepo } from './organizations-members.repo'
import { OrganizationsMembersHelper } from './organizations-members.helper'

const services = [
  OrganizationsMembersService,
  OrganizationsMembersRepo,
  OrganizationsMembersHelper
]

@Module({
  controllers: [OrganizationsMembersController],
  providers: services,
  exports: services
})
export class OrganizationsMembersModule {}
