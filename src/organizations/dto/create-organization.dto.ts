import { IsString, IsNotEmpty, IsOptional, Length } from 'class-validator'

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  orgName: string

  @IsOptional()
  @IsString()
  @Length(14, 14)
  orgCnpj?: string

  @IsOptional()
  @IsString()
  @Length(1, 255)
  orgAddress?: string

  @IsOptional()
  @IsString()
  @Length(1, 15)
  orgPhone?: string

  @IsOptional()
  @IsString()
  orgDescription?: string

  @IsOptional()
  @IsString()
  orgGoals?: string
}
