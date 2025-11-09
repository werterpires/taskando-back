import { userRoleEnum } from 'src/constants/roles.enum'

export interface IOrganization {
  orgId: number
  orgName: string
  orgCnpj?: string
  orgAddress?: string
  orgPhone?: string
  orgDescription?: string
  orgGoals?: string
  currentUserRoles: userRoleEnum
}
