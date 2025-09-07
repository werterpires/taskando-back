
import { Module } from '@nestjs/common'
import { OrganizationsService } from './organizations.service'
import { OrganizationsController } from './organizations.controller'
import { OrganizationsRepo } from './organizations.repo'
import { OrganizationsHelper } from './organizations.helper'

const services = [
  OrganizationsService,
  OrganizationsRepo,
  OrganizationsHelper
]

@Module({
  controllers: [OrganizationsController],
  providers: services,
  exports: services
})
export class OrganizationsModule {}
