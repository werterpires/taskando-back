import { PartialType } from '@nestjs/mapped-types'
import { CreateProductDto } from './create-product.dto'
import { IsNumber } from 'class-validator'

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @IsNumber()
  productId: number
}
