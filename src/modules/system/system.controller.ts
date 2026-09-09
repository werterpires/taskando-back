import { Controller, Get, Post, Patch, Put, Delete, Options, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { SystemService } from "./system.service";
import * as route0 from "../../app/api/approvals/route";
import * as route1 from "../../app/api/audit/[subjectType]/[subjectId]/route";
import * as route2 from "../../app/api/context/route";
import * as route3 from "../../app/api/cyclic-queue/route";
import * as route4 from "../../app/api/dependencies/[id]/route";
import * as route5 from "../../app/api/dependencies/route";
import * as route6 from "../../app/api/domain-compatibility/route";
import * as route11 from "../../app/api/item-invitations/route";
import * as route12 from "../../app/api/item-roles/route";
import * as route17 from "../../app/api/mcp-token/route";
import * as route18 from "../../app/api/me/route";
import * as route30 from "../../app/api/owner-transfers/route";
import * as route34 from "../../app/api/preferences/size-labels/route";
import * as route35 from "../../app/api/priority-matrix/route";
import * as route36 from "../../app/api/privacy/deletion-request/route";
import * as route37 from "../../app/api/privacy/export/route";
@Controller("api/approvals")
export class ApprovalsController {
  constructor(private readonly service: SystemService) {}
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route0.POST); }
}
@Controller("api/audit/:subjectType/:subjectId")
export class AuditController {
  constructor(private readonly service: SystemService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route1.GET); }
}
@Controller("api/context")
export class ContextController {
  constructor(private readonly service: SystemService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route2.GET); }
}
@Controller("api/cyclic-queue")
export class CyclicQueueController {
  constructor(private readonly service: SystemService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route3.GET); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route3.PATCH); }
}
@Controller("api/dependencies/:id")
export class DependencyController {
  constructor(private readonly service: SystemService) {}
  @Delete()
  delete(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route4.DELETE); }
}
@Controller("api/dependencies")
export class DependenciesController {
  constructor(private readonly service: SystemService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route5.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route5.POST); }
}
@Controller("api/domain-compatibility")
export class DomainCompatibilityController {
  constructor(private readonly service: SystemService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route6.GET); }
}
@Controller("api/item-invitations")
export class ItemInvitationsController {
  constructor(private readonly service: SystemService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route11.GET); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route11.PATCH); }
}
@Controller("api/item-roles")
export class ItemRolesController {
  constructor(private readonly service: SystemService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route12.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route12.POST); }
  @Delete()
  delete(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route12.DELETE); }
}
@Controller("api/mcp-token")
export class McpTokenController {
  constructor(private readonly service: SystemService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route17.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route17.POST); }
  @Delete()
  delete(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route17.DELETE); }
}
@Controller("api/me")
export class MeController {
  constructor(private readonly service: SystemService) {}
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route18.POST); }
}
@Controller("api/owner-transfers")
export class OwnerTransfersController {
  constructor(private readonly service: SystemService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route30.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route30.POST); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route30.PATCH); }
}
@Controller("api/preferences/size-labels")
export class SizeLabelsController {
  constructor(private readonly service: SystemService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route34.GET); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route34.PATCH); }
}
@Controller("api/priority-matrix")
export class PriorityMatrixController {
  constructor(private readonly service: SystemService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route35.GET); }
}
@Controller("api/privacy/deletion-request")
export class PrivacyDeletionController {
  constructor(private readonly service: SystemService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route36.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route36.POST); }
}
@Controller("api/privacy/export")
export class PrivacyExportController {
  constructor(private readonly service: SystemService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route37.GET); }
}
export const systemControllers = [ApprovalsController, AuditController, ContextController, CyclicQueueController, DependencyController, DependenciesController, DomainCompatibilityController, ItemInvitationsController, ItemRolesController, McpTokenController, MeController, OwnerTransfersController, SizeLabelsController, PriorityMatrixController, PrivacyDeletionController, PrivacyExportController];
