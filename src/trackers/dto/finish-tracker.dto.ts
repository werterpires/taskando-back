import { IsNumber, IsString } from 'class-validator'

export class FinishTrackerDto {
  @IsNumber()
  trackerId: number

  @IsString()
  endAt: string
}
