import { Type } from 'class-transformer'
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested
} from 'class-validator'

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

  @IsOptional()
  @Type(() => Filter)
  @ValidateNested({ each: true })
  filters: Filter<T>[]

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalItems?: number
}

export class Filter<T> {
  @IsOptional()
  @IsIn(['like', 'equal', 'moreThan', 'lessThan'])
  filterType: 'like' | 'equal' | 'moreThan' | 'lessThan'

  @IsOptional()
  @IsString()
  field: keyof T

  @IsOptional()
  value: string | number | boolean
}
