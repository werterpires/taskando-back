import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  DefaultValuePipe
} from '@nestjs/common'
import { TeamsService } from './teams.service'
import { CreateTeamDto } from './dto/create-team.dto'
import { UpdateTeamDto } from './dto/update-team.dto'
import { CurrentUser } from '../users/decorators/current-user.decorator'
import { ValidateUser } from '../shared/auth/types'
import { Paginator } from '../shared/types/paginator.types'

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  create(
    @Body() createTeamDto: CreateTeamDto,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.teamsService.create(createTeamDto, currentUser)
  }

  @Get()
  findAll(
    @CurrentUser() currentUser: ValidateUser,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('orderBy', new DefaultValuePipe('teamId')) orderBy: string,
    @Query('direction', new DefaultValuePipe('ASC')) direction: string
  ) {
    const paginator: Paginator = { limit, offset, orderBy, direction }
    return this.teamsService.getAll(currentUser, paginator)
  }

  @Get('organization/:orgId')
  findAllByOrgId(
    @Param('orgId', ParseIntPipe) orgId: number,
    @CurrentUser() currentUser: ValidateUser,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('direction', new DefaultValuePipe('ASC')) direction: string
  ) {
    const paginator: Paginator = { limit, offset, orderBy: 'teamId', direction }
    return this.teamsService.findAllByOrgId(orgId, currentUser, paginator)
  }

  @Get('department/:deptId')
  findAllByDeptId(
    @Param('deptId', ParseIntPipe) deptId: number,
    @CurrentUser() currentUser: ValidateUser,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('direction', new DefaultValuePipe('ASC')) direction: string
  ) {
    const paginator: Paginator = { limit, offset, orderBy: 'teamId', direction }
    return this.teamsService.findAllByDeptId(deptId, currentUser, paginator)
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.teamsService.findOne(id, currentUser)
  }

  @Put()
  update(
    @Body() updateTeamDto: UpdateTeamDto,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.teamsService.update(updateTeamDto, currentUser)
  }

  @Delete(':id')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.teamsService.delete(id, currentUser)
  }
}
