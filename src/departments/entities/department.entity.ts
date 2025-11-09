import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'
import { Organization } from '../../organizations/entities/organization.entity'
import { DepartmentMember } from './department-member.entity'

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn({ name: 'dept_id' })
  deptId: number

  @Column({ length: 255 })
  deptName: string

  @Column({ type: 'text', nullable: true })
  deptDescription?: string

  @Column({ type: 'text', nullable: true })
  deptGoals?: string

  @Column({ name: 'active', default: true })
  deptActive: boolean

  @Column({ name: 'org_id', nullable: true })
  orgId?: number

  @OneToMany(() => DepartmentMember, (member) => member.department)
  deptMembers: DepartmentMember[]

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'org_id' })
  organization?: Organization

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
