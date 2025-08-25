
import { IsString, IsNotEmpty, IsOptional, IsNumber, Length } from 'class-validator'

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name: string

  @IsOptional()
  @IsString()
  @Length(14, 14)
  cnpj?: string

  @IsOptional()
  @IsString()
  @Length(1, 255)
  address?: string

  @IsOptional()
  @IsString()
  @Length(1, 15)
  phone?: string

  @IsNumber()
  @IsNotEmpty()
  ownerId: number
}
