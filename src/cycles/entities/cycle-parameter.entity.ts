import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'
import { Cycle } from './cycle.entity'

@Entity('cycle_parameters')
export class CycleParameter {
  @PrimaryGeneratedColumn({ name: 'cycle_parameter_id' })
  cycleParameterId: number

  @Column({ name: 'cycle_id' })
  cycleId: number

  @Column({ name: 'period', length: 20 })
  period: string

  @Column({ name: 'time_value', length: 50 })
  timeValue: string

  @ManyToOne(() => Cycle, (cycle) => cycle.parameters)
  @JoinColumn({ name: 'cycle_id' })
  cycle: Cycle

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
