import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm'
import { Project } from '../../projects/entities/project.entity'
import { ActivityDomain } from '../../activity-domains/entities/activity-domain.entity'

@Entity('streams')
export class Stream {
  @PrimaryGeneratedColumn({ name: 'stream_id' })
  streamId: number

  @Column({ length: 255 })
  streamName: string

  @Column({ type: 'text', nullable: true })
  streamDescription?: string

  @Column({ type: 'text', nullable: true })
  streamGoals?: string

  @Column({ name: 'project_id' })
  projectId: number

  @Column({ name: 'activity_domain_id', nullable: true })
  activityDomainId?: number

  @Column({ name: 'active', default: true })
  streamActive: boolean

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project

  @ManyToOne(() => ActivityDomain, { nullable: true })
  @JoinColumn({ name: 'activity_domain_id' })
  activityDomain?: ActivityDomain

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
