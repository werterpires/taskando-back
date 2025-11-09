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
import { CreateTeamDto } from './dto/create-team.dto'
import { UpdateTeamDto } from './dto/update-team.dto'
import { Team } from './entities/team.entity'
import { TeamsService } from './teams.service'
import { Paginator } from 'src/shared/types/paginator.types'

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  async getAll(
    @Query() query: Paginator<Team>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.teamsService.getAll(query, currentUser)
  }

  @Get('organization/:orgId')
  async getAllByOrgId(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Query() query: Paginator<Team>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.teamsService.getAllByOrgId(orgId, query, currentUser)
  }

  @Get('department/:deptId')
  async getAllByDeptId(
    @Param('deptId', ParseIntPipe) deptId: number,
    @Query() query: Paginator<Team>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.teamsService.getAllByDeptId(deptId, query, currentUser)
  }

  @Get(':id')
  async getOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.teamsService.getOne(id, currentUser)
  }

  @Put()
  async update(
    @Body() updateTeamDto: UpdateTeamDto,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.teamsService.update(updateTeamDto, currentUser)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ValidateUser
  ) {
    await this.teamsService.delete(id, currentUser)
  }

  @Post()
  async create(
    @Body() createTeamDto: CreateTeamDto,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.teamsService.create(createTeamDto, currentUser)
  }
}
