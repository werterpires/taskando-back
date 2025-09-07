
import { IsString, IsEmail, IsNotEmpty, IsNumber } from 'class-validator'
import { userRoleEnum } from 'src/constants/roles.enum'

export class CreateInviteDto {
  @IsNumber()
  @IsNotEmpty()
  orgId: number

  @IsEmail()
  @IsNotEmpty()
  email: string

  @IsString()
  @IsNotEmpty()
  firstName: string

  @IsString()
  @IsNotEmpty()
  lastName: string

  @IsString()
  @IsNotEmpty()
  password: string

  @IsString()
  @IsNotEmpty()
  role: userRoleEnum
}
