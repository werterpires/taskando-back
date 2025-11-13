import { IsNumber } from 'class-validator'

export class CreatePhaseDependencyDto {
  @IsNumber()
  fromPhaseId: number

  @IsNumber()
  toPhaseId: number
}
