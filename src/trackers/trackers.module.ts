import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TrackersController } from './trackers.controller'
import { TrackersService } from './trackers.service'
import { Tracker } from './entities/tracker.entity'
import { Project } from '../projects/entities/project.entity'
import { Stream } from '../streams/entities/stream.entity'
import { Product } from '../products/entities/product.entity'
import { Process } from '../processes/entities/process.entity'
import { Phase } from '../phases/entities/phase.entity'
import { Task } from '../tasks/entities/task.entity'
import { ProjectMember } from '../projects/entities/project-member.entity'
import { ProductMember } from '../products/entities/product-member.entity'
import { ProcessMember } from '../processes/entities/process-member.entity'
import { TaskMember } from '../tasks/entities/task-member.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tracker,
      Project,
      Stream,
      Product,
      Process,
      Phase,
      Task,
      ProjectMember,
      ProductMember,
      ProcessMember,
      TaskMember
    ])
  ],
  controllers: [TrackersController],
  providers: [TrackersService],
  exports: [TrackersService]
})
export class TrackersModule {}
