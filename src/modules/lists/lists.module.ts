import { Module } from "@nestjs/common";
import { listsControllers } from "./lists.controller";
import { ListsService } from "./lists.service";

@Module({ controllers: listsControllers, providers: [ListsService] })
export class ListsModule {}
