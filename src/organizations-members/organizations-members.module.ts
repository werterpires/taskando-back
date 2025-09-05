import { Module } from '@nestjs/common';
import { OrganizationsMembersService } from './organizations-members.service';
import { OrganizationsMembersController } from './organizations-members.controller';

@Module({
  controllers: [OrganizationsMembersController],
  providers: [OrganizationsMembersService],
})
export class OrganizationsMembersModule {}
