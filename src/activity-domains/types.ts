import { userRoleEnum } from 'src/constants/roles.enum'

export interface IActivityDomain {
  activityDomainId: number
  activityDomainName: string
  activityDomainPercentual: number
  deptId?: number
  orgId?: number
  teamId?: number
  squadId?: number
  currentUserRoles: userRoleEnum
}

export interface IActivityDomainBasic {
  activityDomainId: number
  activityDomainName: string
}
