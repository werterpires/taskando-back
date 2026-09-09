import { Module } from "@nestjs/common";
import { planningControllers } from "./planning.controller";
import { PlanningService } from "./planning.service";

@Module({ controllers: planningControllers, providers: [PlanningService] })
export class PlanningModule {}
