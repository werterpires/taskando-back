import { Module } from "@nestjs/common";
import { recurrenceControllers } from "./recurrence.controller";
import { RecurrenceService } from "./recurrence.service";

@Module({ controllers: recurrenceControllers, providers: [RecurrenceService] })
export class RecurrenceModule {}
