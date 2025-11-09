import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'
import { OrganizationMember } from '../../organizations-members/entities/organization-member.entity'
import { Department } from 'src/departments/entities/department.entity'

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn({ name: 'org_id' })
  orgId: number

  @Column({ length: 255 })
  orgName: string

  @Column({ nullable: true, unique: true })
  orgCnpj?: string

  @Column({ length: 255, nullable: true })
  orgAddress?: string

  @Column({ length: 15, nullable: true })
  orgPhone?: string

  @Column({ type: 'text', nullable: true })
  orgDescription?: string

  @Column({ type: 'text', nullable: true })
  orgGoals?: string

  @Column({ name: 'active', default: true })
  orgActive: boolean

  @OneToMany(() => OrganizationMember, (member) => member.organization)
  orgMembers: OrganizationMember[]

  @OneToMany(() => Department, (department) => department.organization)
  orgDepartments: Department[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
