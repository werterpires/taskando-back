import { Body, Controller, Get, HttpCode, Patch, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, appOrigin, cookieOptions } from './auth.service';
@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  private async establishSession(req: Request, res: Response, result: Awaited<ReturnType<AuthService['login']>>) {
    await this.auth.logout(req.cookies?.taskando_session);
    res.cookie('taskando_session', result.token, { ...cookieOptions(), maxAge: 7 * 86400_000 });
    return { user: { id: result.user.id, displayName: result.user.displayName, email: result.user.email }, space: result.space };
  }
  @Post('users') async createUser(@Body() body: { displayName?: unknown; email?: unknown; password?: unknown }, @Req() req: Request) {
    const context = await this.auth.context(req.cookies?.taskando_session);
    if (!context) throw new UnauthorizedException();
    const result = await this.auth.createUser(body ?? {});
    return { user: { id: result.user.id, displayName: result.user.displayName, email: result.user.email } };
  }
  @Post('login') @HttpCode(200) async passwordLogin(@Body() body: { email?: unknown; password?: unknown }, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.establishSession(req, res, await this.auth.login(body ?? {}));
  }
  @Patch('password') async changePassword(@Body() body: { currentPassword?: unknown; newPassword?: unknown }, @Req() req: Request) {
    const token = req.cookies?.taskando_session;
    const context = await this.auth.context(token);
    if (!context) throw new UnauthorizedException();
    await this.auth.changePassword(context.user.id, token, body ?? {});
    return { ok: true };
  }
  @Get('google') async login(@Res() res: Response) {
    try {
      const { state, url } = await this.auth.begin();
      res.cookie('taskando_oauth', state, { ...cookieOptions(), maxAge: 600_000 }); res.redirect(url);
    } catch {
      res.redirect(`${appOrigin()}/?login=unavailable`);
    }
  }
  @Get('google/callback') async callback(@Req() req: Request, @Res() res: Response) {
    res.clearCookie('taskando_oauth', cookieOptions());
    try {
      const token = await this.auth.finish(String(req.query.code ?? ''), String(req.query.state ?? ''), req.cookies?.taskando_oauth ?? '');
      await this.auth.logout(req.cookies?.taskando_session);
      res.cookie('taskando_session', token, { ...cookieOptions(), maxAge: 7 * 86400_000 }); res.redirect(appOrigin());
    } catch { res.redirect(`${appOrigin()}/?login=failed`); }
  }
  @Get('me') async me(@Req() req: Request) {
    const context = await this.auth.context(req.cookies?.taskando_session);
    if (!context) throw new UnauthorizedException();
    return { user: { id: context.user.id, displayName: context.user.displayName, email: context.user.email }, space: context.space };
  }
  @Post('logout') async logout(@Req() req: Request, @Res() res: Response) {
    await this.auth.logout(req.cookies?.taskando_session); res.clearCookie('taskando_session', cookieOptions()); res.json({ ok: true });
  }
}
