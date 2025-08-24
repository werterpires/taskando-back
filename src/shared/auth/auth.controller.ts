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

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  login(@Request() req: AuthRequest, @Body() loginDto: LoginDto) {
    return this.authService.login(req.user)
  }
}
