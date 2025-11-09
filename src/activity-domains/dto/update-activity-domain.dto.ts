import {
  IsString,
  IsOptional,
  Length,
  IsNumber,
  IsNotEmpty,
  Min,
  Max
} from 'class-validator'

export class UpdateActivityDomainDto {
  @IsNumber()
  @IsNotEmpty()
  areaId: number

  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentual?: number
}
