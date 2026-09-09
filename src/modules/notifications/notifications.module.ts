import { Module } from "@nestjs/common";
import { notificationsControllers } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Module({ controllers: notificationsControllers, providers: [NotificationsService] })
export class NotificationsModule {}
