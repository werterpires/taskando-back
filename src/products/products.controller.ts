import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query
} from '@nestjs/common'
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../users/decorators/current-user.decorator'
import { ValidateUser } from '../shared/auth/types'
import { Paginator } from '../shared/types/paginator.types'
import { Response } from '../shared/types/response.types'
import { ProductsService } from './products.service'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { Product } from './entities/product.entity'
import { IProduct } from './types'

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() currentUser: ValidateUser
  ): Promise<IProduct> {
    return this.productsService.create(createProductDto, currentUser)
  }

  @Get(':id')
  async getOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: ValidateUser
  ): Promise<IProduct> {
    return this.productsService.getOne(+id, currentUser)
  }

  @Get()
  async getAll(
    @Query() paginator: Paginator<Product>,
    @CurrentUser() currentUser: ValidateUser
  ): Promise<Response<Product, IProduct>> {
    return this.productsService.getAll(paginator, currentUser)
  }

  @Put()
  async update(
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() currentUser: ValidateUser
  ): Promise<IProduct> {
    return this.productsService.update(updateProductDto, currentUser)
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() currentUser: ValidateUser
  ): Promise<void> {
    return this.productsService.delete(+id, currentUser)
  }
}
