import { userRoleEnum } from 'src/constants/roles.enum'
import { Organization } from 'src/organizations/types'
import { User } from 'src/users/types'

export interface createOrganizationMember {
  userId: number
  orgId: number
  role: userRoleEnum
}
export interface OrganizationMember extends createOrganizationMember {
  user?: User
  organization?: Organization
}
