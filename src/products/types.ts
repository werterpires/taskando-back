export interface IProduct {
  productId: number
  productName: string
  productDescription?: string
  productStartDate?: Date
  productEndDate?: Date
  productStatus: string
  productDeadline: Date
  projectId?: number
  streamId?: number
  orgId?: number
  deptId?: number
  teamId?: number
  squadId?: number
  activityDomainId?: number
  productActive: boolean
  userRole?: string
}
