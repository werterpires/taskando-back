export interface IStream {
  streamId: number
  streamName: string
  streamDescription?: string
  streamGoals?: string
  projectId: number
  activityDomainId?: number
  streamActive: boolean
  created_at: Date
  updated_at: Date
}
