import {
  IsString,
  IsOptional,
  Length,
  IsNumber,
  IsNotEmpty
} from 'class-validator'

export class UpdateSquadDto {
  @IsNumber()
  @IsNotEmpty()
  squadId: number

  @IsOptional()
  @IsString()
  @Length(1, 255)
  squadName?: string

  @IsOptional()
  @IsString()
  squadDescription?: string

  @IsOptional()
  @IsString()
  squadGoals?: string
}
