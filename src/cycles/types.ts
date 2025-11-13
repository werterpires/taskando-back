export interface ICycle {
  cycleId: number
  cycleName: string
  cycleDescription?: string
  cycleStartDate?: Date
  cycleEndDate?: Date
  cycleDeadline?: Date
  cycleStatus: string
  cyclePriority: string
  size?: number
  cycleType: string
  cycleStartsAt?: Date
  duration?: number
  cycleShowInCalendar: boolean
  orgId?: number
  deptId?: number
  teamId?: number
  squadId?: number
  projectId?: number
  streamId?: number
  productId?: number
  processId?: number
  phaseId?: number
  activityDomainId?: number
  cycleActive: boolean
  parameters?: ICycleParameter[]
  userRole?: string
}

export interface ICycleParameter {
  cycleParameterId: number
  cycleId: number
  period: string
  timeValue: string
}
