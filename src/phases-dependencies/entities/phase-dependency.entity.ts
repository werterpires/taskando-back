import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Phase } from '../../phases/entities/phase.entity'

@Entity('phases_dependencies')
export class PhaseDependency {
  @PrimaryColumn({ name: 'from_phase_id' })
  fromPhaseId: number

  @PrimaryColumn({ name: 'to_phase_id' })
  toPhaseId: number

  @ManyToOne(() => Phase)
  @JoinColumn({ name: 'from_phase_id' })
  fromPhase: Phase

  @ManyToOne(() => Phase)
  @JoinColumn({ name: 'to_phase_id' })
  toPhase: Phase
}
