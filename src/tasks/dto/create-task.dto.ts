import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsBoolean,
  MaxLength,
  ValidateIf
} from 'class-validator'

export class CreateTaskDto {
  @IsString()
  @MaxLength(255)
  taskName: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  taskDescription?: string

  @IsOptional()
  @IsDateString()
  taskStartDate?: string

  @IsOptional()
  @IsDateString()
  taskEndDate?: string

  @IsOptional()
  @IsDateString()
  taskDeadline?: string

  @IsString()
  @MaxLength(50)
  taskStatus: string

  @IsString()
  @MaxLength(50)
  taskPriority: string

  @IsOptional()
  @IsNumber()
  size?: number

  @IsString()
  @MaxLength(50)
  taskType: string

  @IsOptional()
  @IsDateString()
  taskStartsAt?: string

  @IsOptional()
  @IsNumber()
  duration?: number

  @IsBoolean()
  taskShowInCalendar: boolean

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
}
