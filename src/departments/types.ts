import { userRoleEnum } from 'src/constants/roles.enum'

export interface IDepartment {
  deptId: number
  deptName: string
  deptDescription?: string
  deptGoals?: string
  orgId?: number
  currentUserRoles: userRoleEnum
}
