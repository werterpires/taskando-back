import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards
} from '@nestjs/common'
import { AuthService } from './auth.service'
import { LocalAuthGuard } from './guards/local-auth.guard'
import { AuthRequest } from './types'
import { LoginDto } from './dtos/login.dto'
import { IsPublic } from './decorators/is-public.decorator'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @IsPublic()
  login(@Request() req: AuthRequest, @Body() loginDto: LoginDto) {
    console.log('req.user', req.user)

    return this.authService.login(req.user)
  }
}
