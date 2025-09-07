
import { IsNumber } from 'class-validator'
import { Type } from 'class-transformer'

export class GetMemberByIdDto {
  @IsNumber()
  @Type(() => Number)
  userId: number

  @IsNumber()
  @Type(() => Number)
  orgId: number
}
