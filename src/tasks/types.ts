export interface ITask {
  taskId: number
  taskName: string
  taskDescription?: string
  taskStartDate?: Date
  taskEndDate?: Date
  taskDeadline?: Date
  taskStatus: string
  taskPriority: string
  size?: number
  taskType: string
  taskStartsAt?: Date
  duration?: number
  taskShowInCalendar: boolean
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
  dependencyThread?: string
  taskActive: boolean
  userRole?: string
}
