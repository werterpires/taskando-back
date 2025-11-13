import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'
import { Department } from '../../departments/entities/department.entity'
import { Organization } from '../../organizations/entities/organization.entity'
import { Team } from '../../teams/entities/team.entity'
import { Squad } from '../../squads/entities/squad.entity'
import { Project } from '../../projects/entities/project.entity'
import { Stream } from '../../streams/entities/stream.entity'
import { Product } from '../../products/entities/product.entity'
import { Process } from '../../processes/entities/process.entity'
import { Phase } from '../../phases/entities/phase.entity'
import { ActivityDomain } from '../../activity-domains/entities/activity-domain.entity'

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn({ name: 'task_id' })
  taskId: number

  @Column({ name: 'task_name', length: 255 })
  taskName: string

  @Column({ name: 'task_description', length: 1000, nullable: true })
  taskDescription?: string

  @Column({ name: 'task_start_date', type: 'date', nullable: true })
  taskStartDate?: Date

  @Column({ name: 'task_end_date', type: 'date', nullable: true })
  taskEndDate?: Date

  @Column({ name: 'task_deadline', type: 'date', nullable: true })
  taskDeadline?: Date

  @Column({ name: 'task_status', length: 50, default: 'PENDING' })
  taskStatus: string

  @Column({ name: 'task_priority', length: 50, default: 'MEDIUM' })
  taskPriority: string

  @Column({ name: 'size', type: 'int', default: 0, nullable: true })
  size?: number

  @Column({ name: 'task_type', length: 50, default: 'GENERAL' })
  taskType: string

  @Column({ name: 'task_starts_at', type: 'datetime', nullable: true })
  taskStartsAt?: Date

  @Column({
    name: 'duration',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true
  })
  duration?: number

  @Column({ name: 'task_show_in_calendar', type: 'boolean', default: true })
  taskShowInCalendar: boolean

  @Column({ name: 'org_id', nullable: true })
  orgId?: number

  @Column({ name: 'dept_id', nullable: true })
  deptId?: number

  @Column({ name: 'team_id', nullable: true })
  teamId?: number

  @Column({ name: 'squad_id', nullable: true })
  squadId?: number

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

  @Column({ name: 'activity_domain_id', nullable: true })
  activityDomainId?: number

  @Column({ name: 'dependency_thread', type: 'text' })
  dependencyThread: string

  @Column({ name: 'active', default: true })
  taskActive: boolean

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'dept_id' })
  department?: Department

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'org_id' })
  organization?: Organization

  @ManyToOne(() => Team, { nullable: true })
  @JoinColumn({ name: 'team_id' })
  team?: Team

  @ManyToOne(() => Squad, { nullable: true })
  @JoinColumn({ name: 'squad_id' })
  squad?: Squad

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

  @ManyToOne(() => ActivityDomain, { nullable: true })
  @JoinColumn({ name: 'activity_domain_id' })
  activityDomain?: ActivityDomain

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
