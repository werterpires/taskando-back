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
import { Task } from './task.entity'

@Entity('task_members')
export class TaskMember {
  @PrimaryColumn({ name: 'user_id' })
  userId: number

  @PrimaryColumn({ name: 'task_id' })
  taskId: number

  @Column({ length: 255 })
  role: string

  @Column({ default: true })
  active: boolean

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User

  @ManyToOne(() => Task)
  @JoinColumn({ name: 'task_id' })
  task: Task

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
