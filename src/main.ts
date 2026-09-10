import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { appOrigin } from './auth/auth.service';
@Catch()
class SafeErrors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const status = error instanceof HttpException ? error.getStatus() : error instanceof SyntaxError ? 400 : 500;
    host.switchToHttp().getResponse<Response>().status(status).json({ error: status === 500 ? 'Não foi possível concluir a operação.' : error instanceof HttpException ? error.message : 'Dados inválidos.' });
  }
}
export async function createApp() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.use(helmet()); app.use(cookieParser());
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    const mcp = ['/mcp', '/api/integrations/mcp'].includes(req.path);
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !mcp && req.headers.origin !== appOrigin()) { res.status(403).json({ error: 'Origem inválida.' }); return; }
    next();
  });
  app.useGlobalFilters(new SafeErrors()); app.enableShutdownHooks();
  return app;
}
if (require.main === module) {
  if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL.');
  void createApp().then(app => app.listen(Number(process.env.PORT ?? 3000), process.env.HOST ?? '0.0.0.0'));
}
