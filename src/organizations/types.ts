import { userRoleEnum } from 'src/constants/roles.enum'
import { User } from 'src/users/types'
import type { Department } from 'src/departments/types'
import type { Team } from 'src/teams/types'

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
  currentUserRoles?: userRoleEnum[]
  departments?: Department[]
  teams?: Team[]
}
