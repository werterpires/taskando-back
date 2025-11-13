import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PhasesDependenciesController } from './phases-dependencies.controller'
import { PhasesDependenciesService } from './phases-dependencies.service'
import { PhaseDependency } from './entities/phase-dependency.entity'
import { Phase } from '../phases/entities/phase.entity'
import { ProcessMember } from '../processes/entities/process-member.entity'

@Module({
  imports: [TypeOrmModule.forFeature([PhaseDependency, Phase, ProcessMember])],
  controllers: [PhasesDependenciesController],
  providers: [PhasesDependenciesService],
  exports: [PhasesDependenciesService]
})
export class PhasesDependenciesModule {}
