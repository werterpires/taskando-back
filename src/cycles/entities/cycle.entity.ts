import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany
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
import { CycleParameter } from './cycle-parameter.entity'
import { CycleMember } from './cycle-member.entity'

@Entity('cycles')
export class Cycle {
  @PrimaryGeneratedColumn({ name: 'cycle_id' })
  cycleId: number

  @Column({ name: 'cycle_name', length: 255 })
  cycleName: string

  @Column({ name: 'cycle_description', length: 1000, nullable: true })
  cycleDescription?: string

  @Column({ name: 'cycle_start_date', type: 'date', nullable: true })
  cycleStartDate?: Date

  @Column({ name: 'cycle_end_date', type: 'date', nullable: true })
  cycleEndDate?: Date

  @Column({ name: 'cycle_deadline', type: 'date', nullable: true })
  cycleDeadline?: Date

  @Column({ name: 'cycle_status', length: 50, default: 'PENDING' })
  cycleStatus: string

  @Column({ name: 'cycle_priority', length: 50, default: 'MEDIUM' })
  cyclePriority: string

  @Column({ name: 'size', type: 'int', default: 0, nullable: true })
  size?: number

  @Column({ name: 'cycle_type', length: 50, default: 'GENERAL' })
  cycleType: string

  @Column({ name: 'cycle_starts_at', type: 'datetime', nullable: true })
  cycleStartsAt?: Date

  @Column({
    name: 'duration',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true
  })
  duration?: number

  @Column({ name: 'cycle_show_in_calendar', type: 'boolean', default: true })
  cycleShowInCalendar: boolean

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

  @Column({ name: 'active', default: true })
  cycleActive: boolean

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

  @OneToMany(() => CycleParameter, (parameter) => parameter.cycle)
  parameters: CycleParameter[]

  @OneToMany(() => CycleMember, (member) => member.cycle)
  members: CycleMember[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
