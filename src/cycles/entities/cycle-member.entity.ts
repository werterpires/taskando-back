import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn
} from 'typeorm'
import { User } from '../../users/entities/user.entity'
import { Cycle } from './cycle.entity'

@Entity('cycle_members')
export class CycleMember {
  @PrimaryColumn({ name: 'user_id' })
  userId: number

  @PrimaryColumn({ name: 'cycle_id' })
  cycleId: number

  @Column({ length: 255 })
  role: string

  @Column({ default: true })
  active: boolean

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User

  @ManyToOne(() => Cycle, (cycle) => cycle.members)
  @JoinColumn({ name: 'cycle_id' })
  cycle: Cycle

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
