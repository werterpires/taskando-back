import { userRoleEnum } from 'src/constants/roles.enum'
import { User } from 'src/users/types'
import type { Organization } from 'src/organizations/types'
import type { Department } from 'src/departments/types'

export interface CreateTeamData {
  name: string
  ownerId: number
  deptId?: number
  orgId?: number
}

export interface Team extends CreateTeamData {
  teamId: number
  owner?: User
  organization?: Organization
  department?: Department
  currentUserRoles?: userRoleEnum[]
}
