import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Task } from '../../tasks/entities/task.entity'

@Entity('tasks_dependencies')
export class TaskDependency {
  @PrimaryColumn({ name: 'from_task_id' })
  fromTaskId: number

  @PrimaryColumn({ name: 'to_task_id' })
  toTaskId: number

  @ManyToOne(() => Task)
  @JoinColumn({ name: 'from_task_id' })
  fromTask: Task

  @ManyToOne(() => Task)
  @JoinColumn({ name: 'to_task_id' })
  toTask: Task
}
