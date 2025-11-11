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
import { Project } from './project.entity'

@Entity('project_members')
export class ProjectMember {
  @PrimaryColumn({ name: 'user_id' })
  userId: number

  @PrimaryColumn({ name: 'project_id' })
  projectId: number

  @Column({ length: 255 })
  role: string

  @Column({ default: true })
  active: boolean

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
