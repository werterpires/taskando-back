import { Type } from 'class-transformer'
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class Paginator<T> {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset: number

  @IsOptional()
  @IsString()
  orderBy: keyof T

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  direction: 'ASC' | 'DESC'

  filters: filter<T>[]

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalItems?: number
}

export class filter<T> {
  @IsOptional()
  @IsIn(['like', 'equal', 'moreThan', 'lessThan'])
  filterType: 'like' | 'equal' | 'moreThan' | 'lessThan'

  @IsOptional()
  @IsString()
  field: keyof T

  @IsOptional()
  value: string | number | boolean
}
