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
import { CreateSquadDto } from './dto/create-squad.dto'
import { UpdateSquadDto } from './dto/update-squad.dto'
import { Squad } from './entities/squad.entity'
import { SquadsService } from './squads.service'
import { Paginator } from 'src/shared/types/paginator.types'

@Controller('squads')
export class SquadsController {
  constructor(private readonly squadsService: SquadsService) {}

  @Get()
  async getAll(
    @Query() query: Paginator<Squad>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.squadsService.getAll(query, currentUser)
  }

  @Get('organization/:orgId')
  async getAllByOrgId(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Query() query: Paginator<Squad>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.squadsService.getAllByOrgId(orgId, query, currentUser)
  }

  @Get('department/:deptId')
  async getAllByDeptId(
    @Param('deptId', ParseIntPipe) deptId: number,
    @Query() query: Paginator<Squad>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.squadsService.getAllByDeptId(deptId, query, currentUser)
  }

  @Get('team/:teamId')
  async getAllByTeamId(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Query() query: Paginator<Squad>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.squadsService.getAllByTeamId(teamId, query, currentUser)
  }

  @Get(':id')
  async getOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.squadsService.getOne(id, currentUser)
  }

  @Put()
  async update(
    @Body() updateSquadDto: UpdateSquadDto,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.squadsService.update(updateSquadDto, currentUser)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ValidateUser
  ) {
    await this.squadsService.delete(id, currentUser)
  }

  @Post()
  async create(
    @Body() createSquadDto: CreateSquadDto,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.squadsService.create(createSquadDto, currentUser)
  }
}
