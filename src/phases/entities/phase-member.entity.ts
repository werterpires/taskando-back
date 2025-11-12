import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { User } from '../../users/entities/user.entity'
import { Phase } from './phase.entity'

@Entity('phase_members')
export class PhaseMember {
  @PrimaryColumn({ name: 'user_id' })
  userId: number

  @PrimaryColumn({ name: 'phase_id' })
  phaseId: number

  @Column({ length: 100 })
  role: string

  @Column({ default: true })
  active: boolean

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User

  @ManyToOne(() => Phase)
  @JoinColumn({ name: 'phase_id' })
  phase: Phase
}
