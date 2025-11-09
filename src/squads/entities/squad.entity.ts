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

@Entity('squads')
export class Squad {
  @PrimaryGeneratedColumn({ name: 'squad_id' })
  squadId: number

  @Column({ length: 255 })
  squadName: string

  @Column({ name: 'dept_id', nullable: true })
  deptId?: number

  @Column({ name: 'org_id', nullable: true })
  orgId?: number

  @Column({ name: 'team_id', nullable: true })
  teamId?: number

  @Column({ type: 'text', nullable: true })
  squadDescription?: string

  @Column({ type: 'text', nullable: true })
  squadGoals?: string

  @Column({ name: 'active', default: true })
  squadActive: boolean

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'dept_id' })
  department?: Department

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'org_id' })
  organization?: Organization

  @ManyToOne(() => Team, { nullable: true })
  @JoinColumn({ name: 'team_id' })
  team?: Team

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
