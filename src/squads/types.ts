import { userRoleEnum } from 'src/constants/roles.enum'

export interface ISquad {
  squadId: number
  squadName: string
  squadDescription?: string
  squadGoals?: string
  deptId?: number
  orgId?: number
  teamId?: number
  currentUserRoles: userRoleEnum
}
