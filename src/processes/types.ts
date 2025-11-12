export interface IProcess {
  processId: number
  processName: string
  processDescription?: string
  processStartDate?: Date
  processEndDate?: Date
  processStatus: string
  processDeadline: Date
  processActive: boolean
  orgId?: number
  deptId?: number
  teamId?: number
  squadId?: number
  productId?: number
  streamId?: number
  projectId?: number
  activityDomainId?: number
  userRole?: string
  createdAt: Date
  updatedAt: Date
}

export interface IProcessInput {
  processName: string
  processDescription?: string
  processStartDate?: string
  processEndDate?: string
  processStatus: string
  processDeadline: string
  orgId?: number
  deptId?: number
  teamId?: number
  squadId?: number
  productId?: number
  streamId?: number
  projectId?: number
  activityDomainId?: number
}
