import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PhasesController } from './phases.controller'
import { PhasesService } from './phases.service'
import { PhasesHelper } from './phases.helper'
import { Phase } from './entities/phase.entity'
import { PhaseMember } from './entities/phase-member.entity'
import { ProcessMember } from '../processes/entities/process-member.entity'
import { Process } from '../processes/entities/process.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([Phase, PhaseMember, ProcessMember, Process])
  ],
  controllers: [PhasesController],
  providers: [PhasesService, PhasesHelper],
  exports: [PhasesService]
})
export class PhasesModule {}
