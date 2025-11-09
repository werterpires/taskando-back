import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Length,
  IsNumber,
  ValidateIf
} from 'class-validator'

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  teamName: string

  @IsOptional()
  @IsString()
  teamDescription?: string

  @IsOptional()
  @IsString()
  teamGoals?: string

  @IsOptional()
  @IsNumber()
  @ValidateIf((o) => !o.orgId) // só pode ter deptId se não tiver orgId
  deptId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf((o) => !o.deptId) // só pode ter orgId se não tiver deptId
  orgId?: number
}
