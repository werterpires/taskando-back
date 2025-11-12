import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  MaxLength
} from 'class-validator'

export class CreatePhaseDto {
  @IsString()
  @MaxLength(255)
  phaseName: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  phaseDescription?: string

  @IsOptional()
  @IsDateString()
  phaseStartDate?: string

  @IsOptional()
  @IsDateString()
  phaseEndDate?: string

  @IsDateString()
  phaseDeadline: string

  @IsNumber()
  processId: number
}
