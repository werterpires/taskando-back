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
import { CreateActivityDomainDto } from './dto/create-activity-domain.dto'
import { UpdateActivityDomainDto } from './dto/update-activity-domain.dto'
import { ActivityDomain } from './entities/activity-domain.entity'
import { ActivityDomainsService } from './activity-domains.service'
import { Paginator } from 'src/shared/types/paginator.types'

@Controller('activity-domains')
export class ActivityDomainsController {
  constructor(
    private readonly activityDomainsService: ActivityDomainsService
  ) {}

  @Get()
  async getAll(
    @Query() query: Paginator<ActivityDomain>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.activityDomainsService.getAll(query, currentUser)
  }

  @Get('organization/:orgId')
  async getAllByOrgId(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Query() query: Paginator<ActivityDomain>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.activityDomainsService.getAllByOrgId(
      orgId,
      query,
      currentUser
    )
  }

  @Get('department/:deptId')
  async getAllByDeptId(
    @Param('deptId', ParseIntPipe) deptId: number,
    @Query() query: Paginator<ActivityDomain>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.activityDomainsService.getAllByDeptId(
      deptId,
      query,
      currentUser
    )
  }

  @Get('team/:teamId')
  async getAllByTeamId(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Query() query: Paginator<ActivityDomain>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.activityDomainsService.getAllByTeamId(
      teamId,
      query,
      currentUser
    )
  }

  @Get('squad/:squadId')
  async getAllBySquadId(
    @Param('squadId', ParseIntPipe) squadId: number,
    @Query() query: Paginator<ActivityDomain>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.activityDomainsService.getAllBySquadId(
      squadId,
      query,
      currentUser
    )
  }

  @Get(':id')
  async getOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.activityDomainsService.getOne(id, currentUser)
  }

  @Put()
  async update(
    @Body() updateActivityDomainDto: UpdateActivityDomainDto,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.activityDomainsService.update(
      updateActivityDomainDto,
      currentUser
    )
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ValidateUser
  ) {
    await this.activityDomainsService.delete(id, currentUser)
  }

  @Post()
  async create(
    @Body() createActivityDomainDto: CreateActivityDomainDto,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.activityDomainsService.create(
      createActivityDomainDto,
      currentUser
    )
  }
}
