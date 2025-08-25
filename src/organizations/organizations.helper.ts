
import { Injectable } from '@nestjs/common'
import { CreateOrganizationDto } from './dto/create-organization.dto'
import { UpdateOrganizationDto } from './dto/update-organization.dto'
import { CreateOrganizationData, Organization } from './types'

@Injectable()
export class OrganizationsHelper {
  makeCreateOrganizationDataFromDto(
    createOrganizationDto: CreateOrganizationDto
  ): CreateOrganizationData {
    return {
      name: createOrganizationDto.name,
      cnpj: createOrganizationDto.cnpj,
      address: createOrganizationDto.address,
      phone: createOrganizationDto.phone,
      ownerId: createOrganizationDto.ownerId
    }
  }

  makeOrganizationFromDto(updateOrganizationDto: UpdateOrganizationDto): Organization {
    return {
      orgId: updateOrganizationDto.orgId,
      name: updateOrganizationDto.name,
      cnpj: updateOrganizationDto.cnpj,
      address: updateOrganizationDto.address,
      phone: updateOrganizationDto.phone,
      ownerId: updateOrganizationDto.ownerId
    }
  }
}
