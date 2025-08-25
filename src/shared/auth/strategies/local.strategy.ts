import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-local'
import { AuthService } from '../auth.service'

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'userEmail' })
  }

  async validate(email: string, password: string) {
    console.log('validate', email, password)
    return await this.authService.validateUser(email, password)
  }
}
