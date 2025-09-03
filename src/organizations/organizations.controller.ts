import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete
} from '@nestjs/common'
import { OrganizationsService } from './organizations.service'
import { CreateOrganizationDto } from './dto/create-organization.dto'
import { UpdateOrganizationDto } from './dto/update-organization.dto'
import { CurrentUser } from '../users/decorators/current-user.decorator'
import { ValidateUser } from '../shared/auth/types'

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
  getAll(@CurrentUser() currentUser: ValidateUser) {
    return this.organizationsService.getAll(currentUser)
  }
}
