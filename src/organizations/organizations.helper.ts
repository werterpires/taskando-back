import { Injectable } from '@nestjs/common'
import { CreateOrganizationDto } from './dto/create-organization.dto'
import { UpdateOrganizationDto } from './dto/update-organization.dto'
import { CreateOrganizationData } from './types'
import { ValidateUser } from '../shared/auth/types'

@Injectable()
export class OrganizationsHelper {
  makeCreateOrganizationDataFromDto(
    createOrganizationDto: CreateOrganizationDto,
    currentUser: ValidateUser
  ): CreateOrganizationData {
    return {
      name: createOrganizationDto.name,
      cnpj: createOrganizationDto.cnpj,
      address: createOrganizationDto.address,
      phone: createOrganizationDto.phone,
      ownerId: currentUser.userId
    }
  }

  makeUpdateOrganizationDataFromDto(
    updateOrganizationDto: UpdateOrganizationDto
  ): Partial<CreateOrganizationData> {
    const updateData: Partial<CreateOrganizationData> = {}
    
    if (updateOrganizationDto.name !== undefined) {
      updateData.name = updateOrganizationDto.name
    }
    if (updateOrganizationDto.cnpj !== undefined) {
      updateData.cnpj = updateOrganizationDto.cnpj
    }
    if (updateOrganizationDto.address !== undefined) {
      updateData.address = updateOrganizationDto.address
    }
    if (updateOrganizationDto.phone !== undefined) {
      updateData.phone = updateOrganizationDto.phone
    }

    return updateData
  }
}
