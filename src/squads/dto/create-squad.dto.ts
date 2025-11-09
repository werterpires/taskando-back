import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Length,
  IsNumber,
  ValidateIf
} from 'class-validator'

export class CreateSquadDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  squadName: string

  @IsOptional()
  @IsString()
  squadDescription?: string

  @IsOptional()
  @IsString()
  squadGoals?: string

  @IsOptional()
  @IsNumber()
  @ValidateIf((o) => !o.orgId && !o.teamId) // só pode ter deptId se não tiver orgId nem teamId
  deptId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf((o) => !o.deptId && !o.teamId) // só pode ter orgId se não tiver deptId nem teamId
  orgId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf((o) => !o.deptId && !o.orgId) // só pode ter teamId se não tiver deptId nem orgId
  teamId?: number
}
