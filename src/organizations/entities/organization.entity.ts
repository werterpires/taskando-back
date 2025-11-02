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

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
