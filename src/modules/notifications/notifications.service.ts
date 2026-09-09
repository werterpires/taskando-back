import { Injectable } from "@nestjs/common";
import type { Request, Response } from "express";
import { DomainService } from "../../http/domain.service";

@Injectable()
export class NotificationsService {
  constructor(private readonly domain: DomainService) {}

  dispatch(request: Request, response: Response, handler: any, bearer = false) {
    return this.domain.dispatch(request, response, handler, bearer);
  }
}
