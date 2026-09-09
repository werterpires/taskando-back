import { Controller, Get, Post, Patch, Put, Delete, Options, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { ProjectsService } from "./projects.service";
import * as route7 from "../../app/api/fronts/[id]/route";
import * as route8 from "../../app/api/fronts/route";
import * as route44 from "../../app/api/projects/[id]/fronts/route";
import * as route45 from "../../app/api/projects/[id]/kanban/route";
import * as route46 from "../../app/api/projects/[id]/route";
import * as route47 from "../../app/api/projects/route";
import * as route48 from "../../app/api/projects/targets/route";
@Controller("api/fronts/:id")
export class FrontController {
  constructor(private readonly service: ProjectsService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route7.GET); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route7.PATCH); }
}
@Controller("api/fronts")
export class FrontsController {
  constructor(private readonly service: ProjectsService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route8.GET); }
}
@Controller("api/projects/:id/fronts")
export class ProjectFrontsController {
  constructor(private readonly service: ProjectsService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route44.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route44.POST); }
}
@Controller("api/projects/:id/kanban")
export class ProjectKanbanController {
  constructor(private readonly service: ProjectsService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route45.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route45.POST); }
}
@Controller("api/projects/:id")
export class ProjectController {
  constructor(private readonly service: ProjectsService) {}
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route46.PATCH); }
}
@Controller("api/projects")
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route47.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route47.POST); }
}
@Controller("api/projects/targets")
export class ProjectTargetsController {
  constructor(private readonly service: ProjectsService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route48.GET); }
}
export const projectsControllers = [FrontController, FrontsController, ProjectFrontsController, ProjectKanbanController, ProjectController, ProjectsController, ProjectTargetsController];
