import { Optional } from '@nestjs/common'
import { IsEmail, Length, Matches } from 'class-validator'

export class CreateUserDto {
  @IsEmail({}, { message: '#Email inválido' })
  email: string

  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/, {
    message:
      '#A senha deve conter pelo menos 8 caracteres, pelo menos uma letra e pelo menos um número'
  })
  password: string

  @Optional()
  @Length(2, 100, {
    message: '#O nome deve ter pelo menos 2 caracteres e no máximo 100'
  })
  firstName?: string

  @Optional()
  @Length(2, 100, {
    message: '#O sobrenome deve ter pelo menos 2 caracteres e no máximo 100'
  })
  lastName?: string
}
