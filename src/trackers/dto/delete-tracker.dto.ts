import { IsNumber } from 'class-validator'

export class DeleteTrackerDto {
  @IsNumber()
  trackerId: number
}
