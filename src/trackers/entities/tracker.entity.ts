import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'
import { User } from '../../users/entities/user.entity'
import { Project } from '../../projects/entities/project.entity'
import { Stream } from '../../streams/entities/stream.entity'
import { Product } from '../../products/entities/product.entity'
import { Process } from '../../processes/entities/process.entity'
import { Phase } from '../../phases/entities/phase.entity'
import { Task } from '../../tasks/entities/task.entity'

@Entity('trackers')
export class Tracker {
  @PrimaryGeneratedColumn({ name: 'tracker_id' })
  trackerId: number

  @Column({ name: 'user_id' })
  userId: number

  @Column({ name: 'start_at', type: 'bigint' })
  startAt: string

  @Column({ name: 'end_at', type: 'bigint', nullable: true })
  endAt?: string

  @Column({ name: 'project_id', nullable: true })
  projectId?: number

  @Column({ name: 'stream_id', nullable: true })
  streamId?: number

  @Column({ name: 'product_id', nullable: true })
  productId?: number

  @Column({ name: 'process_id', nullable: true })
  processId?: number

  @Column({ name: 'phase_id', nullable: true })
  phaseId?: number

  @Column({ name: 'task_id', nullable: true })
  taskId?: number

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User

  @ManyToOne(() => Project, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project?: Project

  @ManyToOne(() => Stream, { nullable: true })
  @JoinColumn({ name: 'stream_id' })
  stream?: Stream

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product?: Product

  @ManyToOne(() => Process, { nullable: true })
  @JoinColumn({ name: 'process_id' })
  process?: Process

  @ManyToOne(() => Phase, { nullable: true })
  @JoinColumn({ name: 'phase_id' })
  phase?: Phase

  @ManyToOne(() => Task, { nullable: true })
  @JoinColumn({ name: 'task_id' })
  task?: Task

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
