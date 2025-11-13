import { IsNumber } from 'class-validator'

export class DeletePhaseDependencyDto {
  @IsNumber()
  fromPhaseId: number

  @IsNumber()
  toPhaseId: number
}
