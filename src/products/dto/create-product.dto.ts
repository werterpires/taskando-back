import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  MaxLength,
  ValidateIf
} from 'class-validator'

export class CreateProductDto {
  @IsString()
  @MaxLength(255)
  productName: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  productDescription?: string

  @IsOptional()
  @IsDateString()
  productStartDate?: string

  @IsOptional()
  @IsDateString()
  productEndDate?: string

  @IsString()
  @MaxLength(50)
  productStatus: string

  @IsDateString()
  productDeadline: string

  @IsOptional()
  @IsNumber()
  projectId?: number

  @IsOptional()
  @IsNumber()
  streamId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf(
    (o) => !o.deptId && !o.teamId && !o.squadId && !o.projectId && !o.streamId
  )
  orgId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf(
    (o) => !o.orgId && !o.teamId && !o.squadId && !o.projectId && !o.streamId
  )
  deptId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf(
    (o) => !o.orgId && !o.deptId && !o.squadId && !o.projectId && !o.streamId
  )
  teamId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf(
    (o) => !o.orgId && !o.deptId && !o.teamId && !o.projectId && !o.streamId
  )
  squadId?: number

  @IsOptional()
  @IsNumber()
  activityDomainId?: number
}
