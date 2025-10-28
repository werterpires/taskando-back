import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { CustomErrors } from '../custom-error-handler/erros.enum'
import { EncryptionService } from '../utils-module/encryption/encryption.service'
import { AuthRepo } from './auth.repo'
import { UserPayload, UserToken, ValidateUser } from './types'

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

    console.log('validated user 0:', user)

    if (user && user.userId > 0) {
      const isPasswordValid = await bcrypt.compare(password, user.password)
      console.log('is password valid:', isPasswordValid)

      if (!isPasswordValid) {
        throw new UnauthorizedException(CustomErrors.UNAUTHORIZED_EXCEPTION)
      }

      user.firstName = this.encryptionService.decrypt(user.firstName || '')
      user.lastName = this.encryptionService.decrypt(user.lastName || '')

      console.log('validated user:', user)

      return {
        ...user,
        password: ''
      }
    }
    throw new Error(CustomErrors.UNAUTHORIZED_EXCEPTION)
  }

  login(user: ValidateUser): UserToken {
    const payload: UserPayload = {
      sub: user.userId,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || ''
    }
    const jwtToken = this.jwtService.sign(payload)
    return { accessToken: jwtToken }
  }
}
