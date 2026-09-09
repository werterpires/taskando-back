import { Controller, Get, Post, Patch, Put, Delete, Options, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { ListsService } from "./lists.service";
import * as route13 from "../../app/api/lists/[id]/route";
import * as route14 from "../../app/api/lists/[id]/tasks/[taskId]/route";
import * as route15 from "../../app/api/lists/[id]/tasks/route";
import * as route16 from "../../app/api/lists/route";
@Controller("api/lists/:id")
export class ListController {
  constructor(private readonly service: ListsService) {}
  @Delete()
  delete(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route13.DELETE); }
}
@Controller("api/lists/:id/tasks/:taskId")
export class ListTaskController {
  constructor(private readonly service: ListsService) {}
  @Delete()
  delete(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route14.DELETE); }
}
@Controller("api/lists/:id/tasks")
export class ListTasksController {
  constructor(private readonly service: ListsService) {}
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route15.POST); }
}
@Controller("api/lists")
export class ListsController {
  constructor(private readonly service: ListsService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route16.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route16.POST); }
}
export const listsControllers = [ListController, ListTaskController, ListTasksController, ListsController];
