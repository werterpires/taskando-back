import { User } from 'src/users/types'

export interface CreateOrganizationData {
  name: string
  ownerId: number
  cnpj?: string
  address?: string
  phone?: string
}

export interface Organization extends CreateOrganizationData {
  orgId: number
  owner?: User
}
