import { Controller, Get, Post, Patch, Put, Delete, Options, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { DomainService } from "./domain.service";
import * as route0 from "../app/api/approvals/route";
import * as route1 from "../app/api/audit/[subjectType]/[subjectId]/route";
import * as route2 from "../app/api/context/route";
import * as route3 from "../app/api/cyclic-queue/route";
import * as route4 from "../app/api/dependencies/[id]/route";
import * as route5 from "../app/api/dependencies/route";
import * as route6 from "../app/api/domain-compatibility/route";
import * as route7 from "../app/api/fronts/[id]/route";
import * as route8 from "../app/api/fronts/route";
import * as route9 from "../app/api/hierarchy/route";
import * as route11 from "../app/api/item-invitations/route";
import * as route12 from "../app/api/item-roles/route";
import * as route13 from "../app/api/lists/[id]/route";
import * as route14 from "../app/api/lists/[id]/tasks/[taskId]/route";
import * as route15 from "../app/api/lists/[id]/tasks/route";
import * as route16 from "../app/api/lists/route";
import * as route17 from "../app/api/mcp-token/route";
import * as route18 from "../app/api/me/route";
import * as route19 from "../app/api/notification-preferences/route";
import * as route20 from "../app/api/notifications/route";
import * as route21 from "../app/api/notifications/sweep/route";
import * as route22 from "../app/api/organizations/[id]/audit/route";
import * as route23 from "../app/api/organizations/[id]/members/[memberId]/route";
import * as route24 from "../app/api/organizations/[id]/members/route";
import * as route25 from "../app/api/organizations/[id]/route";
import * as route26 from "../app/api/organizations/[id]/structure/[kind]/[itemId]/route";
import * as route27 from "../app/api/organizations/[id]/structure/route";
import * as route28 from "../app/api/organizations/[id]/tasks/route";
import * as route29 from "../app/api/organizations/route";
import * as route30 from "../app/api/owner-transfers/route";
import * as route31 from "../app/api/personal/structure/[kind]/[itemId]/route";
import * as route32 from "../app/api/personal/structure/route";
import * as route33 from "../app/api/phases/[id]/route";
import * as route34 from "../app/api/preferences/size-labels/route";
import * as route35 from "../app/api/priority-matrix/route";
import * as route36 from "../app/api/privacy/deletion-request/route";
import * as route37 from "../app/api/privacy/export/route";
import * as route38 from "../app/api/processes/[id]/phases/route";
import * as route39 from "../app/api/processes/[id]/route";
import * as route40 from "../app/api/processes/route";
import * as route41 from "../app/api/products/[id]/route";
import * as route42 from "../app/api/products/route";
import * as route43 from "../app/api/products/targets/route";
import * as route44 from "../app/api/projects/[id]/fronts/route";
import * as route45 from "../app/api/projects/[id]/kanban/route";
import * as route46 from "../app/api/projects/[id]/route";
import * as route47 from "../app/api/projects/route";
import * as route48 from "../app/api/projects/targets/route";
import * as route49 from "../app/api/recurrence-occurrences/[id]/route";
import * as route50 from "../app/api/recurrence-series/[id]/materialize/route";
import * as route51 from "../app/api/recurrence-series/[id]/route";
import * as route52 from "../app/api/recurrence-series/materialize-window/route";
import * as route53 from "../app/api/recurrence-series/route";
import * as route54 from "../app/api/recycle-bin/tasks/route";
import * as route55 from "../app/api/reminders/due/route";
import * as route56 from "../app/api/reminders/route";
import * as route57 from "../app/api/structure/transfer-targets/route";
import * as route58 from "../app/api/task-containers/[parentType]/[parentId]/route";
import * as route59 from "../app/api/tasks/[id]/audit/route";
import * as route60 from "../app/api/tasks/[id]/checklist/[itemId]/route";
import * as route61 from "../app/api/tasks/[id]/checklist/reorder/route";
import * as route62 from "../app/api/tasks/[id]/checklist/route";
import * as route63 from "../app/api/tasks/[id]/comments/[commentId]/route";
import * as route64 from "../app/api/tasks/[id]/comments/route";
import * as route65 from "../app/api/tasks/[id]/route";
import * as route66 from "../app/api/tasks/[id]/subtasks/route";
import * as route67 from "../app/api/tasks/reorder/route";
import * as route68 from "../app/api/tasks/route";
import * as route69 from "../app/api/templates/[id]/instantiate/route";
import * as route70 from "../app/api/templates/route";
import * as route71 from "../app/api/work-progress/[parentType]/[parentId]/route";
@Controller("api/approvals")
export class Route0Controller {
  constructor(private readonly domain: DomainService) {}
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route0.POST); }
}
@Controller("api/audit/:subjectType/:subjectId")
export class Route1Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route1.GET); }
}
@Controller("api/context")
export class Route2Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route2.GET); }
}
@Controller("api/cyclic-queue")
export class Route3Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route3.GET); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route3.PATCH); }
}
@Controller("api/dependencies/:id")
export class Route4Controller {
  constructor(private readonly domain: DomainService) {}
  @Delete()
  delete(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route4.DELETE); }
}
@Controller("api/dependencies")
export class Route5Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route5.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route5.POST); }
}
@Controller("api/domain-compatibility")
export class Route6Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route6.GET); }
}
@Controller("api/fronts/:id")
export class Route7Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route7.GET); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route7.PATCH); }
}
@Controller("api/fronts")
export class Route8Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route8.GET); }
}
@Controller("api/hierarchy")
export class Route9Controller {
  constructor(private readonly domain: DomainService) {}
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route9.POST); }
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route9.GET); }
}
@Controller("api/item-invitations")
export class Route11Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route11.GET); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route11.PATCH); }
}
@Controller("api/item-roles")
export class Route12Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route12.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route12.POST); }
  @Delete()
  delete(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route12.DELETE); }
}
@Controller("api/lists/:id")
export class Route13Controller {
  constructor(private readonly domain: DomainService) {}
  @Delete()
  delete(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route13.DELETE); }
}
@Controller("api/lists/:id/tasks/:taskId")
export class Route14Controller {
  constructor(private readonly domain: DomainService) {}
  @Delete()
  delete(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route14.DELETE); }
}
@Controller("api/lists/:id/tasks")
export class Route15Controller {
  constructor(private readonly domain: DomainService) {}
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route15.POST); }
}
@Controller("api/lists")
export class Route16Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route16.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route16.POST); }
}
@Controller("api/mcp-token")
export class Route17Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route17.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route17.POST); }
  @Delete()
  delete(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route17.DELETE); }
}
@Controller("api/me")
export class Route18Controller {
  constructor(private readonly domain: DomainService) {}
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route18.POST); }
}
@Controller("api/notification-preferences")
export class Route19Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route19.GET); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route19.PATCH); }
}
@Controller("api/notifications")
export class Route20Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route20.GET); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route20.PATCH); }
}
@Controller("api/notifications/sweep")
export class Route21Controller {
  constructor(private readonly domain: DomainService) {}
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route21.POST); }
}
@Controller("api/organizations/:id/audit")
export class Route22Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route22.GET); }
}
@Controller("api/organizations/:id/members/:memberId")
export class Route23Controller {
  constructor(private readonly domain: DomainService) {}
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route23.PATCH); }
}
@Controller("api/organizations/:id/members")
export class Route24Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route24.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route24.POST); }
}
@Controller("api/organizations/:id")
export class Route25Controller {
  constructor(private readonly domain: DomainService) {}
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route25.PATCH); }
}
@Controller("api/organizations/:id/structure/:kind/:itemId")
export class Route26Controller {
  constructor(private readonly domain: DomainService) {}
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route26.PATCH); }
}
@Controller("api/organizations/:id/structure")
export class Route27Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route27.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route27.POST); }
}
@Controller("api/organizations/:id/tasks")
export class Route28Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route28.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route28.POST); }
}
@Controller("api/organizations")
export class Route29Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route29.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route29.POST); }
}
@Controller("api/owner-transfers")
export class Route30Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route30.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route30.POST); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route30.PATCH); }
}
@Controller("api/personal/structure/:kind/:itemId")
export class Route31Controller {
  constructor(private readonly domain: DomainService) {}
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route31.PATCH); }
}
@Controller("api/personal/structure")
export class Route32Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route32.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route32.POST); }
}
@Controller("api/phases/:id")
export class Route33Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route33.GET); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route33.PATCH); }
}
@Controller("api/preferences/size-labels")
export class Route34Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route34.GET); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route34.PATCH); }
}
@Controller("api/priority-matrix")
export class Route35Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route35.GET); }
}
@Controller("api/privacy/deletion-request")
export class Route36Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route36.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route36.POST); }
}
@Controller("api/privacy/export")
export class Route37Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route37.GET); }
}
@Controller("api/processes/:id/phases")
export class Route38Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route38.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route38.POST); }
}
@Controller("api/processes/:id")
export class Route39Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route39.GET); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route39.PATCH); }
}
@Controller("api/processes")
export class Route40Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route40.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route40.POST); }
}
@Controller("api/products/:id")
export class Route41Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route41.GET); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route41.PATCH); }
}
@Controller("api/products")
export class Route42Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route42.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route42.POST); }
}
@Controller("api/products/targets")
export class Route43Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route43.GET); }
}
@Controller("api/projects/:id/fronts")
export class Route44Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route44.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route44.POST); }
}
@Controller("api/projects/:id/kanban")
export class Route45Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route45.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route45.POST); }
}
@Controller("api/projects/:id")
export class Route46Controller {
  constructor(private readonly domain: DomainService) {}
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route46.PATCH); }
}
@Controller("api/projects")
export class Route47Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route47.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route47.POST); }
}
@Controller("api/projects/targets")
export class Route48Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route48.GET); }
}
@Controller("api/recurrence-occurrences/:id")
export class Route49Controller {
  constructor(private readonly domain: DomainService) {}
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route49.PATCH); }
}
@Controller("api/recurrence-series/:id/materialize")
export class Route50Controller {
  constructor(private readonly domain: DomainService) {}
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route50.POST); }
}
@Controller("api/recurrence-series/:id")
export class Route51Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route51.GET); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route51.PATCH); }
  @Delete()
  delete(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route51.DELETE); }
}
@Controller("api/recurrence-series/materialize-window")
export class Route52Controller {
  constructor(private readonly domain: DomainService) {}
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route52.POST); }
}
@Controller("api/recurrence-series")
export class Route53Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route53.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route53.POST); }
}
@Controller("api/recycle-bin/tasks")
export class Route54Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route54.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route54.POST); }
}
@Controller("api/reminders/due")
export class Route55Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route55.GET); }
}
@Controller("api/reminders")
export class Route56Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route56.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route56.POST); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route56.PATCH); }
  @Delete()
  delete(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route56.DELETE); }
}
@Controller("api/structure/transfer-targets")
export class Route57Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route57.GET); }
}
@Controller("api/task-containers/:parentType/:parentId")
export class Route58Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route58.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route58.POST); }
}
@Controller("api/tasks/:id/audit")
export class Route59Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route59.GET); }
}
@Controller("api/tasks/:id/checklist/:itemId")
export class Route60Controller {
  constructor(private readonly domain: DomainService) {}
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route60.PATCH); }
  @Delete()
  delete(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route60.DELETE); }
}
@Controller("api/tasks/:id/checklist/reorder")
export class Route61Controller {
  constructor(private readonly domain: DomainService) {}
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route61.POST); }
}
@Controller("api/tasks/:id/checklist")
export class Route62Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route62.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route62.POST); }
}
@Controller("api/tasks/:id/comments/:commentId")
export class Route63Controller {
  constructor(private readonly domain: DomainService) {}
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route63.PATCH); }
  @Delete()
  delete(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route63.DELETE); }
}
@Controller("api/tasks/:id/comments")
export class Route64Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route64.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route64.POST); }
}
@Controller("api/tasks/:id")
export class Route65Controller {
  constructor(private readonly domain: DomainService) {}
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route65.PATCH); }
  @Delete()
  delete(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route65.DELETE); }
}
@Controller("api/tasks/:id/subtasks")
export class Route66Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route66.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route66.POST); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route66.PATCH); }
}
@Controller("api/tasks/reorder")
export class Route67Controller {
  constructor(private readonly domain: DomainService) {}
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route67.POST); }
}
@Controller("api/tasks")
export class Route68Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route68.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route68.POST); }
}
@Controller("api/templates/:id/instantiate")
export class Route69Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route69.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route69.POST); }
}
@Controller("api/templates")
export class Route70Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route70.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route70.POST); }
}
@Controller("api/work-progress/:parentType/:parentId")
export class Route71Controller {
  constructor(private readonly domain: DomainService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, route71.GET); }
}
export const domainControllers = [Route0Controller, Route1Controller, Route2Controller, Route3Controller, Route4Controller, Route5Controller, Route6Controller, Route7Controller, Route8Controller, Route9Controller, Route11Controller, Route12Controller, Route13Controller, Route14Controller, Route15Controller, Route16Controller, Route17Controller, Route18Controller, Route19Controller, Route20Controller, Route21Controller, Route22Controller, Route23Controller, Route24Controller, Route25Controller, Route26Controller, Route27Controller, Route28Controller, Route29Controller, Route30Controller, Route31Controller, Route32Controller, Route33Controller, Route34Controller, Route35Controller, Route36Controller, Route37Controller, Route38Controller, Route39Controller, Route40Controller, Route41Controller, Route42Controller, Route43Controller, Route44Controller, Route45Controller, Route46Controller, Route47Controller, Route48Controller, Route49Controller, Route50Controller, Route51Controller, Route52Controller, Route53Controller, Route54Controller, Route55Controller, Route56Controller, Route57Controller, Route58Controller, Route59Controller, Route60Controller, Route61Controller, Route62Controller, Route63Controller, Route64Controller, Route65Controller, Route66Controller, Route67Controller, Route68Controller, Route69Controller, Route70Controller, Route71Controller];
