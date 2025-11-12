import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  MaxLength,
  ValidateIf
} from 'class-validator'

export class CreateProcessDto {
  @IsString()
  @MaxLength(255)
  processName: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  processDescription?: string

  @IsOptional()
  @IsDateString()
  processStartDate?: string

  @IsOptional()
  @IsDateString()
  processEndDate?: string

  @IsString()
  @MaxLength(50)
  processStatus: string

  @IsDateString()
  processDeadline: string

  @IsOptional()
  @IsNumber()
  projectId?: number

  @IsOptional()
  @IsNumber()
  streamId?: number

  @IsOptional()
  @IsNumber()
  productId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf(
    (o) =>
      !o.deptId &&
      !o.teamId &&
      !o.squadId &&
      !o.productId &&
      !o.streamId &&
      !o.projectId
  )
  orgId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf(
    (o) =>
      !o.orgId &&
      !o.teamId &&
      !o.squadId &&
      !o.productId &&
      !o.streamId &&
      !o.projectId
  )
  deptId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf(
    (o) =>
      !o.orgId &&
      !o.deptId &&
      !o.squadId &&
      !o.productId &&
      !o.streamId &&
      !o.projectId
  )
  teamId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf(
    (o) =>
      !o.orgId &&
      !o.deptId &&
      !o.teamId &&
      !o.productId &&
      !o.streamId &&
      !o.projectId
  )
  squadId?: number

  @IsOptional()
  @IsNumber()
  activityDomainId?: number
}
