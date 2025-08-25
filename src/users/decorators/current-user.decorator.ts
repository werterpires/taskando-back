import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { AuthRequest, ValidateUser } from 'src/shared/auth/types'

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): ValidateUser => {
    const request = context.switchToHttp().getRequest<AuthRequest>()

    return request.user
  }
)
