import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe
} from '@nestjs/common'
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../users/decorators/current-user.decorator'
import { ValidateUser } from '../shared/auth/types'
import { Paginator } from '../shared/types/paginator.types'
import { ProjectsService } from './projects.service'
import { CreateProjectDto } from './dto/create-project.dto'
import { UpdateProjectDto } from './dto/update-project.dto'
import { Project } from './entities/project.entity'

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.projectsService.create(createProjectDto, currentUser)
  }

  @Get()
  getAll(
    @Query() paginator: Paginator<Project>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.projectsService.getAll(paginator, currentUser)
  }

  @Get('organization/:orgId')
  getAllByOrganizationId(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Query() paginator: Paginator<Project>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.projectsService.getAllByOrganizationId(
      orgId,
      paginator,
      currentUser
    )
  }

  @Get('department/:deptId')
  getAllByDepartmentId(
    @Param('deptId', ParseIntPipe) deptId: number,
    @Query() paginator: Paginator<Project>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.projectsService.getAllByDepartmentId(
      deptId,
      paginator,
      currentUser
    )
  }

  @Get('team/:teamId')
  getAllByTeamId(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Query() paginator: Paginator<Project>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.projectsService.getAllByTeamId(teamId, paginator, currentUser)
  }

  @Get('squad/:squadId')
  getAllBySquadId(
    @Param('squadId', ParseIntPipe) squadId: number,
    @Query() paginator: Paginator<Project>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.projectsService.getAllBySquadId(squadId, paginator, currentUser)
  }

  @Get('activity-domain/:activityDomainId')
  getAllByActivityDomainId(
    @Param('activityDomainId', ParseIntPipe) activityDomainId: number,
    @Query() paginator: Paginator<Project>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.projectsService.getAllByActivityDomainId(
      activityDomainId,
      paginator,
      currentUser
    )
  }

  @Get(':id')
  getOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.projectsService.getOne(id, currentUser)
  }

  @Put()
  update(
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.projectsService.update(updateProjectDto, currentUser)
  }

  @Delete(':id')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.projectsService.delete(id, currentUser)
  }
}
