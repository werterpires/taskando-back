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
import { ActivityDomain } from '../../activity-domains/entities/activity-domain.entity'

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn({ name: 'project_id' })
  projectId: number

  @Column({ length: 255 })
  projectName: string

  @Column({ type: 'text', nullable: true })
  projectDescription?: string

  @Column({ type: 'date', nullable: true })
  projectStartDate?: Date

  @Column({ type: 'date', nullable: true })
  projectEndDate?: Date

  @Column({ length: 50, default: 'PENDING' })
  projectStatus: string

  @Column({ type: 'date' })
  projectDeadline: Date

  @Column({ type: 'text', nullable: true })
  projectGoals?: string

  @Column({ name: 'dept_id', nullable: true })
  deptId?: number

  @Column({ name: 'org_id', nullable: true })
  orgId?: number

  @Column({ name: 'team_id', nullable: true })
  teamId?: number

  @Column({ name: 'squad_id', nullable: true })
  squadId?: number

  @Column({ name: 'activity_domain_id', nullable: true })
  activityDomainId?: number

  @Column({ name: 'active', default: true })
  projectActive: boolean

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

  @ManyToOne(() => ActivityDomain, { nullable: true })
  @JoinColumn({ name: 'activity_domain_id' })
  activityDomain?: ActivityDomain

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
