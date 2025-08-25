
import { Injectable } from '@nestjs/common'
import { CreateOrganizationDto } from './dto/create-organization.dto'
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
      ownerId: currentUser.sub
    }
  }
}
