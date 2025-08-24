import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Length,
  Matches
} from 'class-validator'

export class LoginDto {
  @IsEmail(
    {},
    {
      message: '#O email enviado não é um email válido.'
    }
  )
  userEmail: string

  @IsNotEmpty({
    message: '#A senha deve ser informada.'
  })
  @Length(8, 16, {
    message: '#A senha deve ter de 8 a 16 caracteres.'
  })
  @Matches(
    /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+-={}|[\]:";'<>,.?/~`]).{8,}$/,
    {
      message:
        '#A senha deve possuir letras minúsculas, maiúsculas, numeros, caracteres especiais e ter de 8 a 16 caracteres.'
    }
  )
  password: string
}
