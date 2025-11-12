import { IsNumber } from 'class-validator'
import { CreatePhaseDto } from './create-phase.dto'

export class UpdatePhaseDto extends CreatePhaseDto {
  @IsNumber()
  phaseId: number
}
