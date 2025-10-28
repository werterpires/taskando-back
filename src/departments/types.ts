import { userRoleEnum } from 'src/constants/roles.enum'
import { User } from 'src/users/types'
import { Organization } from 'src/organizations/types'

export interface CreateDepartmentData {
  name: string
  ownerId: number
  orgId?: number
}

export interface Department extends CreateDepartmentData {
  deptId: number
  owner?: User
  organization?: Organization
  currentUserRoles?: userRoleEnum[]
}
