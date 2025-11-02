import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'
import { User } from '../../users/entities/user.entity'
import { Organization } from '../../organizations/entities/organization.entity'

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn({ name: 'dept_id' })
  deptId: number

  @Column({ length: 255 })
  name: string

  @Column({ name: 'owner_id' })
  ownerId: number

  @Column({ name: 'org_id', nullable: true })
  orgId?: number

  @ManyToOne(() => User)
  @JoinColumn({ name: 'owner_id' })
  owner: User

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'org_id' })
  organization?: Organization

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
