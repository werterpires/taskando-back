import { userRoleEnum } from 'src/constants/roles.enum'

export interface IActivityDomain {
  areaId: number
  activityDomainName: string
  activityDomainPercentual: number
  deptId?: number
  orgId?: number
  teamId?: number
  squadId?: number
  currentUserRoles: userRoleEnum
}
