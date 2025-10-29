import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Length,
  IsNumber
} from 'class-validator'

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name: string

  @IsOptional()
  @IsNumber()
  deptId?: number

  @IsOptional()
  @IsNumber()
  orgId?: number
}
