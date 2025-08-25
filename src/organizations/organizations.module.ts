import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsRepo } from './organizations.repo';
import { OrganizationsHelper } from './organizations.helper';

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationsRepo, OrganizationsHelper],
})
export class OrganizationsModule {}
