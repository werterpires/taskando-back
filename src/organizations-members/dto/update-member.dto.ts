
import { IsNumber, IsBoolean, IsEnum } from 'class-validator'
import { Type } from 'class-transformer'
import { userRoleEnum } from 'src/constants/roles.enum'

export class UpdateMemberDto {
  @IsEnum(userRoleEnum)
  role: userRoleEnum

  @IsNumber()
  @Type(() => Number)
  userId: number

  @IsNumber()
  @Type(() => Number)
  orgId: number

  @IsBoolean()
  active: boolean
}
