import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { StreamsController } from './streams.controller'
import { StreamsService } from './streams.service'
import { StreamsHelper } from './streams.helper'
import { Stream } from './entities/stream.entity'
import { Project } from '../projects/entities/project.entity'
import { ActivityDomain } from '../activity-domains/entities/activity-domain.entity'
import { ProjectMember } from '../projects/entities/project-member.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([Stream, Project, ActivityDomain, ProjectMember])
  ],
  controllers: [StreamsController],
  providers: [StreamsService, StreamsHelper],
  exports: [StreamsService]
})
export class StreamsModule {}
