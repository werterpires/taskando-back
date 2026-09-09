import { Module } from "@nestjs/common";
import { organizationsControllers } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";

@Module({ controllers: organizationsControllers, providers: [OrganizationsService] })
export class OrganizationsModule {}
