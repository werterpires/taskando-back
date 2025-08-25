import {
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common'
import { AuthRepo } from './auth.repo'
import * as bcrypt from 'bcrypt'
import { CustomErrors } from '../custom-error-handler/erros.enum'
import { UserPayload, UserToken, ValidateUser } from './types'
import { JwtService } from '@nestjs/jwt'
import { EncryptionService } from '../utils-module/encryption/encryption.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepo: AuthRepo,
    private readonly jwtService: JwtService,
    private readonly encryptionService: EncryptionService
  ) {}

  async validateUser(email: string, password: string): Promise<ValidateUser> {
    const user: ValidateUser | undefined =
      await this.authRepo.findUserByEmailForLogin(email)

    console.log('user NO VALIDATE', user)
    console.log(user && user.userId > 0)

    if (user && user.userId > 0) {
      console.log('password', password, user.password)
      const isPasswordValid = await bcrypt.compare(password, user.password)

      console.log('isPasswordValid', isPasswordValid)

      if (!isPasswordValid) {
        throw new UnauthorizedException(CustomErrors.UNAUTHORIZED_EXCEPTION)
      }

      user.firstName = this.encryptionService.decrypt(user.firstName)
      user.lastName = this.encryptionService.decrypt(user.lastName)

      return {
        ...user,
        password: ''
      }
    }
    throw new Error(CustomErrors.UNAUTHORIZED_EXCEPTION)
  }

  async login(user: ValidateUser): Promise<UserToken> {
    console.log('user', user)
    const payload: UserPayload = {
      sub: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    }
    const jwtToken = this.jwtService.sign(payload)
    return { accessToken: jwtToken }
  }
}
