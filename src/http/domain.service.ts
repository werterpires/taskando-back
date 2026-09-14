import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { AuthService, appOrigin } from '../auth/auth.service';
import { getDb, transaction } from '../db';
import { withPersonalContext } from '../db/current-user';
import { affectsCachedProjection, ProjectionCache, successfulMcpMutation } from './projection-cache';
type Handler = (request: Request, context: { params: Promise<any> }) => Promise<Response>;
class DomainRejection { constructor(readonly response: Response) {} }
@Injectable()
export class DomainService {
  constructor(private readonly auth: AuthService, private readonly cache: ProjectionCache) {}
  async dispatch(req: ExpressRequest, res: ExpressResponse, handler: Handler, bearer = false) {
    let result: Response;
    const isRead = req.method === 'GET';
    const context = bearer ? null : await this.auth.context(req.cookies?.taskando_session);
    if (!bearer && !context) throw new UnauthorizedException();
    const execute = async () => transaction(async () => {
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) if (typeof value === 'string') headers.set(key, value);
      const request = new Request(new URL(req.originalUrl, appOrigin()), { method: req.method, headers, ...(!['GET', 'HEAD'].includes(req.method) ? { body: JSON.stringify(req.body ?? {}) } : {}) });
      const invoke = () => handler(request, { params: Promise.resolve(req.params) });
      const response = context ? await withPersonalContext({ ...context, db: await getDb() }, invoke) : await invoke();
      if (response.status >= 400) throw new DomainRejection(response);
      return response;
    }, !isRead && req.method !== 'HEAD');
    try {
      result = isRead && context ? await this.cache.read(context.user.id, req.originalUrl, execute) : await execute();
    } catch (error) {
      if (error instanceof DomainRejection) result = error.response;
      else throw error;
    }
    if (result.status < 400 && affectsCachedProjection(req.method, req.path)) this.cache.invalidate();
    if (bearer && req.method === 'POST' && ['/mcp', '/api/integrations/mcp'].includes(req.path) && result.status === 200) {
      const payload = await result.clone().json().catch(() => null);
      if (successfulMcpMutation(req.body, payload)) this.cache.invalidate();
    }
    if (!result.headers.has('X-Taskando-Cache')) result.headers.set('X-Taskando-Cache', 'BYPASS');
    res.status(result.status); result.headers.forEach((value, key) => res.setHeader(key, value));
    res.send(Buffer.from(await result.arrayBuffer()));
  }
}
