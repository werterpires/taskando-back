import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query
} from '@nestjs/common'
import { ValidateUser } from '../shared/auth/types'
import { CurrentUser } from 'src/users/decorators/current-user.decorator'
import { CreateOrganizationDto } from './dto/create-organization.dto'
import { UpdateOrganizationDto } from './dto/update-organization.dto'
import { Organization } from './entities/organization.entity'
import { OrganizationsService } from './organizations.service'
import { Paginator } from 'src/shared/types/paginator.types'

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  async getAll(
    @Query() query: Paginator<Organization>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.organizationsService.getAll(query, currentUser)
  }

  @Get(':id')
  async getOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.organizationsService.getOne(id, currentUser)
  }

  @Put()
  async update(
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.organizationsService.update(updateOrganizationDto, currentUser)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ValidateUser
  ) {
    await this.organizationsService.delete(id, currentUser)
  }

  @Post()
  async create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.organizationsService.create(createOrganizationDto, currentUser)
  }
}
