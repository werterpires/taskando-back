import { IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateTrackerDto {
  @IsNumber()
  trackerId: number

  @IsOptional()
  @IsString()
  startAt?: string

  @IsOptional()
  @IsString()
  endAt?: string
}
