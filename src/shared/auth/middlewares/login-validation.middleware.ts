import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'
import { validate } from 'class-validator'
import { LoginDto } from '../dtos/login.dto'

@Injectable()
export class LoginValidationMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const body: LoginDto = req.body

    const loginRequestBody = new LoginDto()
    loginRequestBody.userEmail = body.userEmail
    loginRequestBody.password = body.password

    const validations = await validate(loginRequestBody)
    if (validations.length > 0) {
      throw new BadRequestException(
        validations.reduce((acc, curr) => {
          return [...acc, ...Object.values(curr.constraints || '')]
        }, [])
      )
    }
    next()
  }
}
