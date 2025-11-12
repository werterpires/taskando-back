export interface IPhase {
  phaseId: number
  phaseName: string
  phaseDescription?: string
  phaseStartDate?: Date
  phaseEndDate?: Date
  phaseDeadline: Date
  processId: number
  phaseActive: boolean
  userRole?: string
  createdAt: Date
  updatedAt: Date
}

export interface IPhaseInput {
  phaseName: string
  phaseDescription?: string
  phaseStartDate?: string
  phaseEndDate?: string
  phaseDeadline: string
  processId: number
}
