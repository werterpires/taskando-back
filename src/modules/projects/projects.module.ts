import { Module } from "@nestjs/common";
import { projectsControllers } from "./projects.controller";
import { ProjectsService } from "./projects.service";

@Module({ controllers: projectsControllers, providers: [ProjectsService] })
export class ProjectsModule {}
