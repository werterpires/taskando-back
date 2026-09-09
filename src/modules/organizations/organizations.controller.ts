import { Controller, Get, Post, Patch, Put, Delete, Options, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { OrganizationsService } from "./organizations.service";
import * as route22 from "../../app/api/organizations/[id]/audit/route";
import * as route23 from "../../app/api/organizations/[id]/members/[memberId]/route";
import * as route24 from "../../app/api/organizations/[id]/members/route";
import * as route25 from "../../app/api/organizations/[id]/route";
import * as route26 from "../../app/api/organizations/[id]/structure/[kind]/[itemId]/route";
import * as route27 from "../../app/api/organizations/[id]/structure/route";
import * as route28 from "../../app/api/organizations/[id]/tasks/route";
import * as route29 from "../../app/api/organizations/route";
@Controller("api/organizations/:id/audit")
export class OrganizationAuditController {
  constructor(private readonly service: OrganizationsService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route22.GET); }
}
@Controller("api/organizations/:id/members/:memberId")
export class OrganizationMemberController {
  constructor(private readonly service: OrganizationsService) {}
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route23.PATCH); }
}
@Controller("api/organizations/:id/members")
export class OrganizationMembersController {
  constructor(private readonly service: OrganizationsService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route24.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route24.POST); }
}
@Controller("api/organizations/:id")
export class OrganizationController {
  constructor(private readonly service: OrganizationsService) {}
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route25.PATCH); }
}
@Controller("api/organizations/:id/structure/:kind/:itemId")
export class OrganizationStructureItemController {
  constructor(private readonly service: OrganizationsService) {}
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route26.PATCH); }
}
@Controller("api/organizations/:id/structure")
export class OrganizationStructureController {
  constructor(private readonly service: OrganizationsService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route27.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route27.POST); }
}
@Controller("api/organizations/:id/tasks")
export class OrganizationTasksController {
  constructor(private readonly service: OrganizationsService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route28.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route28.POST); }
}
@Controller("api/organizations")
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route29.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route29.POST); }
}
export const organizationsControllers = [OrganizationAuditController, OrganizationMemberController, OrganizationMembersController, OrganizationController, OrganizationStructureItemController, OrganizationStructureController, OrganizationTasksController, OrganizationsController];
