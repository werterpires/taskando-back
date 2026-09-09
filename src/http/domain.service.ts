import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { AuthService, appOrigin } from '../auth/auth.service';
import { transaction } from '../db';
import { withPersonalContext } from '../db/current-user';
type Handler = (request: Request, context: { params: Promise<any> }) => Promise<Response>;
class DomainRejection { constructor(readonly response: Response) {} }
@Injectable()
export class DomainService {
  constructor(private readonly auth: AuthService) {}
  async dispatch(req: ExpressRequest, res: ExpressResponse, handler: Handler, bearer = false) {
    let result: Response;
    try {
      result = await transaction(async () => {
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) if (typeof value === 'string') headers.set(key, value);
        const request = new Request(new URL(req.originalUrl, appOrigin()), { method: req.method, headers, ...(!['GET', 'HEAD'].includes(req.method) ? { body: JSON.stringify(req.body ?? {}) } : {}) });
        const execute = () => handler(request, { params: Promise.resolve(req.params) });
        let response: Response;
        if (bearer) response = await execute();
        else {
          const context = await this.auth.context(req.cookies?.taskando_session);
          if (!context) throw new UnauthorizedException();
          response = await withPersonalContext(context, execute);
        }
        if (response.status >= 400) throw new DomainRejection(response);
        return response;
      }, !['GET', 'HEAD'].includes(req.method));
    } catch (error) {
      if (error instanceof DomainRejection) result = error.response;
      else throw error;
    }
    res.status(result.status); result.headers.forEach((value, key) => res.setHeader(key, value));
    res.send(Buffer.from(await result.arrayBuffer()));
  }
}
