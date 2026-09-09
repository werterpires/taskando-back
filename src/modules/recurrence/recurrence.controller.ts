import { Controller, Get, Post, Patch, Put, Delete, Options, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { RecurrenceService } from "./recurrence.service";
import * as route49 from "../../app/api/recurrence-occurrences/[id]/route";
import * as route50 from "../../app/api/recurrence-series/[id]/materialize/route";
import * as route51 from "../../app/api/recurrence-series/[id]/route";
import * as route52 from "../../app/api/recurrence-series/materialize-window/route";
import * as route53 from "../../app/api/recurrence-series/route";
import * as route69 from "../../app/api/templates/[id]/instantiate/route";
import * as route70 from "../../app/api/templates/route";
@Controller("api/recurrence-occurrences/:id")
export class RecurrenceOccurrenceController {
  constructor(private readonly service: RecurrenceService) {}
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route49.PATCH); }
}
@Controller("api/recurrence-series/:id/materialize")
export class RecurrenceMaterializeController {
  constructor(private readonly service: RecurrenceService) {}
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route50.POST); }
}
@Controller("api/recurrence-series/:id")
export class RecurrenceSeriesItemController {
  constructor(private readonly service: RecurrenceService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route51.GET); }
  @Patch()
  patch(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route51.PATCH); }
  @Delete()
  delete(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route51.DELETE); }
}
@Controller("api/recurrence-series/materialize-window")
export class RecurrenceWindowController {
  constructor(private readonly service: RecurrenceService) {}
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route52.POST); }
}
@Controller("api/recurrence-series")
export class RecurrenceSeriesController {
  constructor(private readonly service: RecurrenceService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route53.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route53.POST); }
}
@Controller("api/templates/:id/instantiate")
export class TemplateInstantiateController {
  constructor(private readonly service: RecurrenceService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route69.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route69.POST); }
}
@Controller("api/templates")
export class TemplatesController {
  constructor(private readonly service: RecurrenceService) {}
  @Get()
  get(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route70.GET); }
  @Post()
  post(@Req() req: Request, @Res() res: Response) { return this.service.dispatch(req, res, route70.POST); }
}
export const recurrenceControllers = [RecurrenceOccurrenceController, RecurrenceMaterializeController, RecurrenceSeriesItemController, RecurrenceWindowController, RecurrenceSeriesController, TemplateInstantiateController, TemplatesController];
