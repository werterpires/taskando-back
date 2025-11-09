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
  deptName: string

  @IsOptional()
  @IsString()
  deptDescription?: string

  @IsOptional()
  @IsString()
  deptGoals?: string

  @IsOptional()
  @IsNumber()
  orgId?: number
}
