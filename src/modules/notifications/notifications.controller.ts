import { Controller, Get, Post, Patch, Put, Delete, Options, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { NotificationsService } from "./notifications.service";
import * as route19 from "../../app/api/notification-preferences/route";
import * as route20 from "../../app/api/notifications/route";
import * as route21 from "../../app/api/notifications/sweep/route";
import * as route55 from "../../app/api/reminders/due/route";
import * as route56 from "../../app/api/reminders/route";
@Controller("api/notification-preferences")
export class NotificationPreferencesController {
  constructor(private readonly service: NotificationsService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route19.GET); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route19.PATCH); }
}
@Controller("api/notifications")
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route20.GET); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route20.PATCH); }
}
@Controller("api/notifications/sweep")
export class NotificationSweepController {
  constructor(private readonly service: NotificationsService) {}
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route21.POST); }
}
@Controller("api/reminders/due")
export class DueRemindersController {
  constructor(private readonly service: NotificationsService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route55.GET); }
}
@Controller("api/reminders")
export class RemindersController {
  constructor(private readonly service: NotificationsService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route56.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route56.POST); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route56.PATCH); }
  @Delete()
  delete(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route56.DELETE); }
}
export const notificationsControllers = [NotificationPreferencesController, NotificationsController, NotificationSweepController, DueRemindersController, RemindersController];
