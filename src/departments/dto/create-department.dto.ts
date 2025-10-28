import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Length,
  IsNumber
} from 'class-validator'

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name: string

  @IsOptional()
  @IsNumber()
  orgId?: number
}
