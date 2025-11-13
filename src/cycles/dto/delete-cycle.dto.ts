import { IsNumber } from 'class-validator'

export class DeleteCycleDto {
  @IsNumber()
  cycleId: number
}
