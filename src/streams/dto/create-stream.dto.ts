import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateStreamDto {
  @IsString()
  @MaxLength(255)
  streamName: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  streamDescription?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  streamGoals?: string

  @IsNumber()
  projectId: number

  @IsOptional()
  @IsNumber()
  activityDomainId?: number
}
