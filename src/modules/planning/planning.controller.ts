import { Controller, Get, Post, Patch, Put, Delete, Options, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { PlanningService } from "./planning.service";
import * as route33 from "../../app/api/phases/[id]/route";
import * as route38 from "../../app/api/processes/[id]/phases/route";
import * as route39 from "../../app/api/processes/[id]/route";
import * as route40 from "../../app/api/processes/route";
import * as route41 from "../../app/api/products/[id]/route";
import * as route42 from "../../app/api/products/route";
import * as route43 from "../../app/api/products/targets/route";
@Controller("api/phases/:id")
export class PhaseController {
  constructor(private readonly service: PlanningService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route33.GET); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route33.PATCH); }
}
@Controller("api/processes/:id/phases")
export class ProcessPhasesController {
  constructor(private readonly service: PlanningService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route38.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route38.POST); }
}
@Controller("api/processes/:id")
export class ProcessController {
  constructor(private readonly service: PlanningService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route39.GET); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route39.PATCH); }
}
@Controller("api/processes")
export class ProcessesController {
  constructor(private readonly service: PlanningService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route40.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route40.POST); }
}
@Controller("api/products/:id")
export class ProductController {
  constructor(private readonly service: PlanningService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route41.GET); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route41.PATCH); }
}
@Controller("api/products")
export class ProductsController {
  constructor(private readonly service: PlanningService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route42.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route42.POST); }
}
@Controller("api/products/targets")
export class ProductTargetsController {
  constructor(private readonly service: PlanningService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route43.GET); }
}
export const planningControllers = [PhaseController, ProcessPhasesController, ProcessController, ProcessesController, ProductController, ProductsController, ProductTargetsController];
