import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  MaxLength,
  ValidateIf
} from 'class-validator'

export class CreateProjectDto {
  @IsString()
  @MaxLength(255)
  projectName: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  projectDescription?: string

  @IsOptional()
  @IsDateString()
  projectStartDate?: string

  @IsOptional()
  @IsDateString()
  projectEndDate?: string

  @IsString()
  @MaxLength(50)
  projectStatus: string

  @IsDateString()
  projectDeadline: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  projectGoals?: string

  @IsOptional()
  @IsNumber()
  @ValidateIf((o) => !o.deptId && !o.teamId && !o.squadId)
  orgId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf((o) => !o.orgId && !o.teamId && !o.squadId)
  deptId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf((o) => !o.orgId && !o.deptId && !o.squadId)
  teamId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf((o) => !o.orgId && !o.deptId && !o.teamId)
  squadId?: number

  @IsOptional()
  @IsNumber()
  activityDomainId?: number
}
