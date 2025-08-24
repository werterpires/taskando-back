import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { config } from 'dotenv'
import { UserFromJwt, UserPayload } from '../types'

config()

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    if (!process.env.JWT_SECRET) {
      throw new InternalServerErrorException('#JWT_SECRET is not defined')
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET
    })
  }

  validate(payload: UserPayload): UserFromJwt {
    return {
      userId: payload.sub,
      userEmail: payload.userEmail,
      userName: payload.userName,
      userRoles: payload.usersRoles,
      userActive: payload.userActive
    }
  }
}
