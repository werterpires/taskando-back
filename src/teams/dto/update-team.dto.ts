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
  name?: string
}
