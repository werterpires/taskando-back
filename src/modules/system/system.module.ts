import { Module } from "@nestjs/common";
import { systemControllers } from "./system.controller";
import { SystemService } from "./system.service";

@Module({ controllers: systemControllers, providers: [SystemService] })
export class SystemModule {}
