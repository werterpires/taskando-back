import { Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, appOrigin, cookieOptions } from './auth.service';
@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Get('google') async login(@Res() res: Response) {
    const { state, url } = await this.auth.begin();
    res.cookie('taskando_oauth', state, { ...cookieOptions(), maxAge: 600_000 }); res.redirect(url);
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
