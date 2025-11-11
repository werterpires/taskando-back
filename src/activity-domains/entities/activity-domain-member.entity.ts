import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn
} from 'typeorm'
import { User } from '../../users/entities/user.entity'
import { ActivityDomain } from './activity-domain.entity'

@Entity('activity_domain_members')
export class ActivityDomainMember {
  @PrimaryColumn({ name: 'user_id' })
  userId: number

  @PrimaryColumn({ name: 'area_id' })
  areaId: number

  @Column({ length: 255 })
  role: string

  @Column({ default: true })
  active: boolean

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User

  @ManyToOne(() => ActivityDomain)
  @JoinColumn({ name: 'area_id' })
  activityDomain: ActivityDomain

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
