import {
  IsString,
  IsOptional,
  Length,
  IsNumber,
  IsNotEmpty
} from 'class-validator'

export class UpdateDepartmentDto {
  @IsNumber()
  @IsNotEmpty()
  deptId: number

  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string
}
