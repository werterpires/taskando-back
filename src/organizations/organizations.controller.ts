import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  Put
} from '@nestjs/common'
import { OrganizationsService } from './organizations.service'
import { CreateOrganizationDto } from './dto/create-organization.dto'
import { UpdateOrganizationDto } from './dto/update-organization.dto'
import { CurrentUser } from '../users/decorators/current-user.decorator'
import { ValidateUser } from '../shared/auth/types'
import { Paginator } from '../shared/types/paginator.types'

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.organizationsService.create(createOrganizationDto, currentUser)
  }

  @Get()
  getAll(
    @CurrentUser() currentUser: ValidateUser,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('orderBy', new DefaultValuePipe('orgId')) orderBy: string,
    @Query('direction', new DefaultValuePipe('ASC')) direction: string
  ) {
    const paginator: Paginator = { limit, offset, orderBy, direction }
    return this.organizationsService.getAll(currentUser, paginator)
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.organizationsService.findOne(id, currentUser)
  }

  @Put()
  update(
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.organizationsService.update(updateOrganizationDto, currentUser)
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.organizationsService.remove(id, currentUser)
  }
}
