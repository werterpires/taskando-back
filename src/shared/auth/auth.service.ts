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
import {
  Logon,
  UserPayload,
  UserToken,
  UserToLogon,
  ValidateUser
} from './types'
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

    if (user && user.userId > 0) {
      const isPasswordValid = await bcrypt.compare(password, user.userPassword)

      if (!isPasswordValid) {
        throw new UnauthorizedException(CustomErrors.UNAUTHORIZED_EXCEPTION)
      }

      if (!user.userActive) {
        throw new ForbiddenException(CustomErrors.INACTIVE_USER)
      }

      user.userName = this.encryptionService.decrypt(user.userName)

      return {
        ...user,
        userPassword: ''
      }
    }
    throw new Error(CustomErrors.UNAUTHORIZED_EXCEPTION)
  }

  async login(user: ValidateUser): Promise<UserToken> {
    const notSignedPolicies = await this.authRepo.findActiveTermsNotSigned(
      user.userRoles,
      user.userId
    )

    const notSignedPoliciesIds = notSignedPolicies.map(
      (policy) => policy.termId
    )

    const payload: UserPayload = {
      sub: user.userId,
      userEmail: user.userEmail,
      userName: user.userName,
      userActive: user.userActive,
      usersRoles: user.userRoles
    }
    const jwtToken = this.jwtService.sign(payload)
    return { accessToken: jwtToken }
  }
}
