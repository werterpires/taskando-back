import { Module } from "@nestjs/common";
import { structureControllers } from "./structure.controller";
import { StructureService } from "./structure.service";

@Module({ controllers: structureControllers, providers: [StructureService] })
export class StructureModule {}
