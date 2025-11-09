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

@Entity('activity_domains')
export class ActivityDomain {
  @PrimaryGeneratedColumn({ name: 'area_id' })
  areaId: number

  @Column({ length: 255 })
  name: string

  @Column({ name: 'dept_id', nullable: true })
  deptId?: number

  @Column({ name: 'org_id', nullable: true })
  orgId?: number

  @Column({ name: 'team_id', nullable: true })
  teamId?: number

  @Column({ name: 'squad_id', nullable: true })
  squadId?: number

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  percentual: number

  @Column({ name: 'active', default: true })
  active: boolean

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

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
