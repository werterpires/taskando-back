import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsBoolean,
  MaxLength,
  ValidateIf,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsIn
} from 'class-validator'
import { Type } from 'class-transformer'

export class CreateCycleParameterDto {
  @IsString()
  @IsIn(['DAY', 'WEEK', 'MONTH', 'YEAR'])
  period: string

  @IsString()
  timeValue: string
}

export class CreateCycleDto {
  @IsString()
  @MaxLength(255)
  cycleName: string

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

  @IsString()
  @MaxLength(50)
  cycleStatus: string

  @IsString()
  @MaxLength(50)
  cyclePriority: string

  @IsOptional()
  @IsNumber()
  size?: number

  @IsString()
  @MaxLength(50)
  @IsIn(['GENERAL', 'APPOINTMENT'])
  cycleType: string

  @IsOptional()
  @IsDateString()
  cycleStartsAt?: string

  @IsOptional()
  @IsNumber()
  duration?: number

  @IsBoolean()
  cycleShowInCalendar: boolean

  @IsOptional()
  @IsNumber()
  @ValidateIf(
    (o) =>
      !o.deptId &&
      !o.teamId &&
      !o.squadId &&
      !o.projectId &&
      !o.streamId &&
      !o.productId &&
      !o.processId &&
      !o.phaseId
  )
  orgId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf(
    (o) =>
      !o.orgId &&
      !o.teamId &&
      !o.squadId &&
      !o.projectId &&
      !o.streamId &&
      !o.productId &&
      !o.processId &&
      !o.phaseId
  )
  deptId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf(
    (o) =>
      !o.orgId &&
      !o.deptId &&
      !o.squadId &&
      !o.projectId &&
      !o.streamId &&
      !o.productId &&
      !o.processId &&
      !o.phaseId
  )
  teamId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf(
    (o) =>
      !o.orgId &&
      !o.deptId &&
      !o.teamId &&
      !o.projectId &&
      !o.streamId &&
      !o.productId &&
      !o.processId &&
      !o.phaseId
  )
  squadId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf(
    (o) =>
      !o.orgId &&
      !o.deptId &&
      !o.teamId &&
      !o.squadId &&
      !o.streamId &&
      !o.productId &&
      !o.processId &&
      !o.phaseId
  )
  projectId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf(
    (o) =>
      !o.orgId &&
      !o.deptId &&
      !o.teamId &&
      !o.squadId &&
      !o.projectId &&
      !o.productId &&
      !o.processId &&
      !o.phaseId
  )
  streamId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf(
    (o) =>
      !o.orgId &&
      !o.deptId &&
      !o.teamId &&
      !o.squadId &&
      !o.projectId &&
      !o.streamId &&
      !o.processId &&
      !o.phaseId
  )
  productId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf(
    (o) =>
      !o.orgId &&
      !o.deptId &&
      !o.teamId &&
      !o.squadId &&
      !o.projectId &&
      !o.streamId &&
      !o.productId &&
      !o.phaseId
  )
  processId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf(
    (o) =>
      !o.orgId &&
      !o.deptId &&
      !o.teamId &&
      !o.squadId &&
      !o.projectId &&
      !o.streamId &&
      !o.productId &&
      !o.processId
  )
  phaseId?: number

  @IsOptional()
  @IsNumber()
  activityDomainId?: number

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCycleParameterDto)
  parameters: CreateCycleParameterDto[]
}
