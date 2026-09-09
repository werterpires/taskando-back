import { Module } from "@nestjs/common";
import { tasksControllers } from "./tasks.controller";
import { TasksService } from "./tasks.service";

@Module({ controllers: tasksControllers, providers: [TasksService] })
export class TasksModule {}
