import { Controller, Get, Post, Delete, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import * as transport from '../app/mcp/route';
import { DomainService } from './domain.service';
@Controller(['api/integrations/mcp', 'mcp'])
export class McpController {
  constructor(private readonly domain: DomainService) {}
  @Post() post(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, transport.POST, true); }
  @Get() get(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, transport.GET, true); }
  @Delete() delete(@Req() req: Request, @Res() res: Response) { return this.domain.dispatch(req, res, transport.DELETE, true); }
}
