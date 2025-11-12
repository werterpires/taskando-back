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
import { ActivityDomain } from '../../activity-domains/entities/activity-domain.entity'

@Entity('processes')
export class Process {
  @PrimaryGeneratedColumn({ name: 'process_id' })
  processId: number

  @Column({ length: 255 })
  processName: string

  @Column({ type: 'text', nullable: true })
  processDescription?: string

  @Column({ type: 'date', nullable: true })
  processStartDate?: Date

  @Column({ type: 'date', nullable: true })
  processEndDate?: Date

  @Column({ length: 50, default: 'PENDING' })
  processStatus: string

  @Column({ type: 'date' })
  processDeadline: Date

  @Column({ name: 'org_id', nullable: true })
  orgId?: number

  @Column({ name: 'dept_id', nullable: true })
  deptId?: number

  @Column({ name: 'team_id', nullable: true })
  teamId?: number

  @Column({ name: 'squad_id', nullable: true })
  squadId?: number

  @Column({ name: 'product_id', nullable: true })
  productId?: number

  @Column({ name: 'stream_id', nullable: true })
  streamId?: number

  @Column({ name: 'project_id', nullable: true })
  projectId?: number

  @Column({ name: 'activity_domain_id', nullable: true })
  activityDomainId?: number

  @Column({ name: 'active', default: true })
  processActive: boolean

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'org_id' })
  organization?: Organization

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'dept_id' })
  department?: Department

  @ManyToOne(() => Team, { nullable: true })
  @JoinColumn({ name: 'team_id' })
  team?: Team

  @ManyToOne(() => Squad, { nullable: true })
  @JoinColumn({ name: 'squad_id' })
  squad?: Squad

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product?: Product

  @ManyToOne(() => Stream, { nullable: true })
  @JoinColumn({ name: 'stream_id' })
  stream?: Stream

  @ManyToOne(() => Project, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project?: Project

  @ManyToOne(() => ActivityDomain, { nullable: true })
  @JoinColumn({ name: 'activity_domain_id' })
  activityDomain?: ActivityDomain

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
