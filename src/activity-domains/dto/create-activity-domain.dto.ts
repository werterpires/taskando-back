import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Length,
  IsNumber,
  ValidateIf,
  Min,
  Max
} from 'class-validator'

export class CreateActivityDomainDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  activityDomainName: string

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  activityDomainPercentual?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf((o) => !o.orgId && !o.teamId && !o.squadId)
  deptId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf((o) => !o.deptId && !o.teamId && !o.squadId)
  orgId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf((o) => !o.deptId && !o.orgId && !o.squadId)
  teamId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf((o) => !o.deptId && !o.orgId && !o.teamId)
  squadId?: number
}
