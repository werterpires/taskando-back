import { Controller, Post, Delete, Body, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../users/decorators/current-user.decorator'
import { ValidateUser } from '../shared/auth/types'
import { TasksDependenciesService } from './tasks-dependencies.service'
import { CreateTaskDependencyDto } from './dto/create-task-dependency.dto'
import { DeleteTaskDependencyDto } from './dto/delete-task-dependency.dto'
import { ITaskDependency } from './types'

@Controller('tasks-dependencies')
@UseGuards(JwtAuthGuard)
export class TasksDependenciesController {
  constructor(
    private readonly tasksDependenciesService: TasksDependenciesService
  ) {}

  @Post()
  async create(
    @Body() createTaskDependencyDto: CreateTaskDependencyDto,
    @CurrentUser() currentUser: ValidateUser
  ): Promise<ITaskDependency> {
    return this.tasksDependenciesService.create(
      createTaskDependencyDto,
      currentUser
    )
  }

  @Delete()
  async delete(
    @Body() deleteTaskDependencyDto: DeleteTaskDependencyDto,
    @CurrentUser() currentUser: ValidateUser
  ): Promise<void> {
    return this.tasksDependenciesService.delete(
      deleteTaskDependencyDto,
      currentUser
    )
  }
}
