export interface ITracker {
  trackerId: number
  userId: number
  startAt: string
  endAt?: string
  projectId?: number
  streamId?: number
  productId?: number
  processId?: number
  phaseId?: number
  taskId?: number
}
