import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm'
import { Process } from '../../processes/entities/process.entity'

@Entity('phases')
export class Phase {
  @PrimaryGeneratedColumn({ name: 'phase_id' })
  phaseId: number

  @Column({ name: 'phase_name', length: 255 })
  phaseName: string

  @Column({ name: 'phase_description', length: 1000, nullable: true })
  phaseDescription?: string

  @Column({ name: 'phase_start_date', type: 'date', nullable: true })
  phaseStartDate?: Date

  @Column({ name: 'phase_end_date', type: 'date', nullable: true })
  phaseEndDate?: Date

  @Column({ name: 'phase_deadline', type: 'date' })
  phaseDeadline: Date

  @Column({ name: 'process_id' })
  processId: number

  @Column({ name: 'active', default: true })
  phaseActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @ManyToOne(() => Process)
  @JoinColumn({ name: 'process_id' })
  process: Process
}
