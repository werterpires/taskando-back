import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TasksDependenciesController } from './tasks-dependencies.controller'
import { TasksDependenciesService } from './tasks-dependencies.service'
import { TaskDependency } from './entities/task-dependency.entity'
import { Task } from '../tasks/entities/task.entity'
import { ProcessMember } from '../processes/entities/process-member.entity'
import { Phase } from '../phases/entities/phase.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskDependency,
      Task,
      ProcessMember,
      Phase
    ])
  ],
  controllers: [TasksDependenciesController],
  providers: [TasksDependenciesService],
  exports: [TasksDependenciesService]
})
export class TasksDependenciesModule {}
