import { userRoleEnum } from 'src/constants/roles.enum'

export interface IActivityDomain {
  areaId: number
  name: string
  percentual: number
  deptId?: number
  orgId?: number
  teamId?: number
  squadId?: number
  currentUserRoles: userRoleEnum
}
