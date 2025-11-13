import {
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  MaxLength,
  IsArray,
  ValidateNested,
  IsIn
} from 'class-validator'
import { Type } from 'class-transformer'

export class UpdateCycleParameterDto {
  @IsOptional()
  @IsNumber()
  cycleParameterId?: number

  @IsString()
  @IsIn(['DAY', 'WEEK', 'MONTH', 'YEAR'])
  period: string

  @IsString()
  timeValue: string
}

export class UpdateCycleDto {
  @IsNumber()
  cycleId: number

  @IsOptional()
  @IsString()
  @MaxLength(255)
  cycleName?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  cycleDescription?: string

  @IsOptional()
  @IsDateString()
  cycleStartDate?: string

  @IsOptional()
  @IsDateString()
  cycleEndDate?: string

  @IsOptional()
  @IsDateString()
  cycleDeadline?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  cycleStatus?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  cyclePriority?: string

  @IsOptional()
  @IsNumber()
  size?: number

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @IsIn(['GENERAL', 'APPOINTMENT'])
  cycleType?: string

  @IsOptional()
  @IsDateString()
  cycleStartsAt?: string

  @IsOptional()
  @IsNumber()
  duration?: number

  @IsOptional()
  @IsBoolean()
  cycleShowInCalendar?: boolean

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateCycleParameterDto)
  parameters?: UpdateCycleParameterDto[]

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  parametersToDelete?: number[]
}
