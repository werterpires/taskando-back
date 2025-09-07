
import { IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class GetAllMembersDto {
  @IsNumber()
  @Type(() => Number)
  orgId: number

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0

  @IsOptional()
  @IsString()
  orderBy?: string = 'userId'

  @IsOptional()
  @IsString()
  direction?: string = 'ASC'
}
