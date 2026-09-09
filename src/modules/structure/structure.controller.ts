import { Controller, Get, Post, Patch, Put, Delete, Options, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { StructureService } from "./structure.service";
import * as route9 from "../../app/api/hierarchy/route";
import * as route31 from "../../app/api/personal/structure/[kind]/[itemId]/route";
import * as route32 from "../../app/api/personal/structure/route";
import * as route57 from "../../app/api/structure/transfer-targets/route";
import * as route58 from "../../app/api/task-containers/[parentType]/[parentId]/route";
import * as route71 from "../../app/api/work-progress/[parentType]/[parentId]/route";
@Controller("api/hierarchy")
export class HierarchyController {
  constructor(private readonly service: StructureService) {}
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route9.POST); }
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route9.GET); }
}
@Controller("api/personal/structure/:kind/:itemId")
export class PersonalStructureItemController {
  constructor(private readonly service: StructureService) {}
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route31.PATCH); }
}
@Controller("api/personal/structure")
export class PersonalStructureController {
  constructor(private readonly service: StructureService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route32.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route32.POST); }
}
@Controller("api/structure/transfer-targets")
export class TransferTargetsController {
  constructor(private readonly service: StructureService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route57.GET); }
}
@Controller("api/task-containers/:parentType/:parentId")
export class TaskContainersController {
  constructor(private readonly service: StructureService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route58.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route58.POST); }
}
@Controller("api/work-progress/:parentType/:parentId")
export class WorkProgressController {
  constructor(private readonly service: StructureService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route71.GET); }
}
export const structureControllers = [HierarchyController, PersonalStructureItemController, PersonalStructureController, TransferTargetsController, TaskContainersController, WorkProgressController];
