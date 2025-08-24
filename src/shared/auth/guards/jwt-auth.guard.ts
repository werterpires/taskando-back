// NestJS
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super()
  }

  canActivate(context: ExecutionContext): Promise<boolean> | boolean {
    const canActivate = super.canActivate(context)
    if (typeof canActivate === 'boolean') {
      return canActivate
    }

    const canActivatePromise = canActivate as Promise<boolean>

    return canActivatePromise.catch((error) => {
      if (error instanceof UnauthorizedException) {
        throw new UnauthorizedException(error.message)
      }

      throw new UnauthorizedException(
        '#É preciso fazer login para acessar esse recurso'
      )
    })
  }
}
