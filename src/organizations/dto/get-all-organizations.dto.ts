import { IsOptional, IsString, IsNumber, Min, IsIn } from 'class-validator'
import { Transform, Type } from 'class-transformer'

export class GetAllOrganizationsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0

  @IsOptional()
  @IsString()
  orderBy?: string = 'orgName'

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  direction?: 'ASC' | 'DESC' = 'ASC'

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  activeOnly?: boolean = true
}
