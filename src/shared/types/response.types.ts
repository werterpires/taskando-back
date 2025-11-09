import { Paginator } from './paginator.types'

export interface Response<T, U> {
  paginator: Paginator<T>
  itens: U[]
}
