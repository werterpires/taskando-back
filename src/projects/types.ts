export interface IProject {
  projectId: number
  projectName: string
  projectDescription?: string
  projectStartDate?: Date
  projectEndDate?: Date
  projectStatus: string
  projectDeadline: Date
  projectGoals?: string
  orgId?: number
  deptId?: number
  teamId?: number
  squadId?: number
  activityDomainId?: number
  projectActive: boolean
  userRole?: string
}
