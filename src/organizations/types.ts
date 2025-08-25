
export interface CreateOrganizationData {
  name: string
  cnpj?: string
  address?: string
  phone?: string
  ownerId: number
}

export interface Organization extends CreateOrganizationData {
  orgId: number
}
