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
import { User } from '../../users/entities/user.entity'
import { OrganizationMember } from '../../organizations-members/entities/organization-member.entity'
import { Department } from 'src/departments/entities/department.entity'

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn({ name: 'org_id' })
  orgId: number

  @Column({ length: 255 })
  name: string

  @Column({ length: 14, nullable: true, unique: true })
  cnpj?: string

  @Column({ length: 255, nullable: true })
  address?: string

  @Column({ length: 15, nullable: true })
  phone?: string

  @Column({ name: 'owner_id' })
  ownerId: number

  @ManyToOne(() => User)
  @JoinColumn({ name: 'owner_id' })
  owner: User

  @OneToMany(() => OrganizationMember, (member) => member.organization)
  members: OrganizationMember[]

  @OneToMany(() => Department, (department) => department.organization)
  departments: Department[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
