import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { User } from '../../users/entities/user.entity'
import { Product } from './product.entity'

@Entity('product_members')
export class ProductMember {
  @PrimaryColumn({ name: 'user_id' })
  userId: number

  @PrimaryColumn({ name: 'product_id' })
  productId: number

  @Column({ type: 'varchar', length: 100 })
  role: string

  @Column({ type: 'boolean', default: true })
  active: boolean

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product
}
