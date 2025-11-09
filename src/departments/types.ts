import { userRoleEnum } from 'src/constants/roles.enum'
import { User } from 'src/users/types'
import type { IOrganization } from 'src/organizations/types'
import type { Team } from 'src/teams/types'

export interface CreateDepartmentData {
  name: string
  ownerId: number
  orgId?: number
}

export interface Department extends CreateDepartmentData {
  deptId: number
  owner?: User
  organization?: IOrganization
  currentUserRoles?: userRoleEnum[]
  teams?: Team[]
}
