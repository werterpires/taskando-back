import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { User } from '../../users/entities/user.entity'
import { Process } from './process.entity'

@Entity('process_members')
export class ProcessMember {
  @PrimaryColumn({ name: 'user_id' })
  userId: number

  @PrimaryColumn({ name: 'process_id' })
  processId: number

  @Column({ type: 'varchar', length: 100 })
  role: string

  @Column({ type: 'boolean', default: true })
  active: boolean

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User

  @ManyToOne(() => Process)
  @JoinColumn({ name: 'process_id' })
  process: Process
}
