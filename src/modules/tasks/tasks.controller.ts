import { Controller, Get, Post, Patch, Put, Delete, Options, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { TasksService } from "./tasks.service";
import * as route54 from "../../app/api/recycle-bin/tasks/route";
import * as route59 from "../../app/api/tasks/[id]/audit/route";
import * as route60 from "../../app/api/tasks/[id]/checklist/[itemId]/route";
import * as route61 from "../../app/api/tasks/[id]/checklist/reorder/route";
import * as route62 from "../../app/api/tasks/[id]/checklist/route";
import * as route63 from "../../app/api/tasks/[id]/comments/[commentId]/route";
import * as route64 from "../../app/api/tasks/[id]/comments/route";
import * as route65 from "../../app/api/tasks/[id]/route";
import * as route66 from "../../app/api/tasks/[id]/subtasks/route";
import * as route67 from "../../app/api/tasks/reorder/route";
import * as route68 from "../../app/api/tasks/route";
@Controller("api/recycle-bin/tasks")
export class RecycleBinController {
  constructor(private readonly service: TasksService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route54.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route54.POST); }
}
@Controller("api/tasks/:id/audit")
export class TaskAuditController {
  constructor(private readonly service: TasksService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route59.GET); }
}
@Controller("api/tasks/:id/checklist/:itemId")
export class ChecklistItemController {
  constructor(private readonly service: TasksService) {}
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route60.PATCH); }
  @Delete()
  delete(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route60.DELETE); }
}
@Controller("api/tasks/:id/checklist/reorder")
export class ChecklistReorderController {
  constructor(private readonly service: TasksService) {}
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route61.POST); }
}
@Controller("api/tasks/:id/checklist")
export class ChecklistController {
  constructor(private readonly service: TasksService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route62.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route62.POST); }
}
@Controller("api/tasks/:id/comments/:commentId")
export class TaskCommentController {
  constructor(private readonly service: TasksService) {}
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route63.PATCH); }
  @Delete()
  delete(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route63.DELETE); }
}
@Controller("api/tasks/:id/comments")
export class TaskCommentsController {
  constructor(private readonly service: TasksService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route64.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route64.POST); }
}
@Controller("api/tasks/:id")
export class TaskController {
  constructor(private readonly service: TasksService) {}
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route65.PATCH); }
  @Delete()
  delete(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route65.DELETE); }
}
@Controller("api/tasks/:id/subtasks")
export class SubtasksController {
  constructor(private readonly service: TasksService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route66.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route66.POST); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route66.PATCH); }
}
@Controller("api/tasks/reorder")
export class TaskReorderController {
  constructor(private readonly service: TasksService) {}
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route67.POST); }
}
@Controller("api/tasks")
export class TasksController {
  constructor(private readonly service: TasksService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route68.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route68.POST); }
}
export const tasksControllers = [RecycleBinController, TaskAuditController, ChecklistItemController, ChecklistReorderController, ChecklistController, TaskCommentController, TaskCommentsController, TaskController, SubtasksController, TaskReorderController, TasksController];
