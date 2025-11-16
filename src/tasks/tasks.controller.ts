import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Query
} from '@nestjs/common'
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../users/decorators/current-user.decorator'
import { ValidateUser } from '../shared/auth/types'
import { TasksService } from './tasks.service'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { Paginator } from '../shared/types/paginator.types'
import { Task } from './entities/task.entity'

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.tasksService.create(createTaskDto, currentUser)
  }

  @Get(':id')
  getOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.tasksService.getOne(id, currentUser)
  }

  @Put()
  update(
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.tasksService.update(updateTaskDto, currentUser)
  }

  @Delete(':id')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.tasksService.delete(id, currentUser)
  }

  @Get()
  async getAll(
    @Query() query: Paginator<Task>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.tasksService.getAll(query, currentUser)
  }

  @Get('organization/:orgId')
  async getAllByOrgId(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Query() query: Paginator<Task>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.tasksService.getAllByOrgId(orgId, query, currentUser)
  }

  @Get('department/:deptId')
  async getAllByDeptId(
    @Param('deptId', ParseIntPipe) deptId: number,
    @Query() query: Paginator<Task>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.tasksService.getAllByDeptId(deptId, query, currentUser)
  }

  @Get('team/:teamId')
  async getAllByTeamId(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Query() query: Paginator<Task>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.tasksService.getAllByTeamId(teamId, query, currentUser)
  }

  @Get('squad/:squadId')
  async getAllBySquadId(
    @Param('squadId', ParseIntPipe) squadId: number,
    @Query() query: Paginator<Task>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.tasksService.getAllBySquadId(squadId, query, currentUser)
  }

  @Get('project/:projectId')
  async getAllByProjectId(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() query: Paginator<Task>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.tasksService.getAllByProjectId(
      projectId,
      query,
      currentUser
    )
  }

  @Get('stream/:streamId')
  async getAllByStreamId(
    @Param('streamId', ParseIntPipe) streamId: number,
    @Query() query: Paginator<Task>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.tasksService.getAllByStreamId(
      streamId,
      query,
      currentUser
    )
  }

  @Get('product/:productId')
  async getAllByProductId(
    @Param('productId', ParseIntPipe) productId: number,
    @Query() query: Paginator<Task>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.tasksService.getAllByProductId(
      productId,
      query,
      currentUser
    )
  }

  @Get('process/:processId')
  async getAllByProcessId(
    @Param('processId', ParseIntPipe) processId: number,
    @Query() query: Paginator<Task>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.tasksService.getAllByProcessId(
      processId,
      query,
      currentUser
    )
  }

  @Get('phase/:phaseId')
  async getAllByPhaseId(
    @Param('phaseId', ParseIntPipe) phaseId: number,
    @Query() query: Paginator<Task>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.tasksService.getAllByPhaseId(phaseId, query, currentUser)
  }
}
