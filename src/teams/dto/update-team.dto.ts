import {
  IsString,
  IsOptional,
  Length,
  IsNumber,
  IsNotEmpty
} from 'class-validator'

export class UpdateTeamDto {
  @IsNumber()
  @IsNotEmpty()
  teamId: number

  @IsOptional()
  @IsString()
  @Length(1, 255)
  teamName?: string

  @IsOptional()
  @IsString()
  teamDescription?: string

  @IsOptional()
  @IsString()
  teamGoals?: string
}
