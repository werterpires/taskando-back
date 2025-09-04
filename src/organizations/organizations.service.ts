import { Injectable } from '@nestjs/common'
import { CreateOrganizationDto } from './dto/create-organization.dto'
import { UpdateOrganizationDto } from './dto/update-organization.dto'
import { OrganizationsRepo } from './organizations.repo'
import { OrganizationsHelper } from './organizations.helper'
import { ValidateUser } from '../shared/auth/types'
import { Paginator } from '../shared/types/paginator.types'
import { Response } from '../shared/types/response.types'
import { Organization } from './types'

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsRepo: OrganizationsRepo,
    private readonly organizationsHelper: OrganizationsHelper
  ) {}

  async create(
    createOrganizationDto: CreateOrganizationDto,
    currentUser: ValidateUser
  ) {
    const createOrganizationData =
      this.organizationsHelper.makeCreateOrganizationDataFromDto(
        createOrganizationDto,
        currentUser
      )
    return await this.organizationsRepo.createOrganization(
      createOrganizationData
    )
  }

  async getAll(currentUser: ValidateUser, paginator: Paginator): Promise<Response<Organization>> {
    const itens = await this.organizationsRepo.getAllByOwnerId(
      currentUser.userId,
      paginator
    )
    const quantity = await this.organizationsRepo.countByOwnerId(
      currentUser.userId
    )
    
    return {
      quantity,
      itens
    }
  }

  async findOne(orgId: number, currentUser: ValidateUser): Promise<Organization | null> {
    return await this.organizationsRepo.getById(orgId, currentUser.userId)
  }

  async update(
    updateOrganizationDto: UpdateOrganizationDto,
    currentUser: ValidateUser
  ) {
    const updateOrganizationData =
      this.organizationsHelper.makeUpdateOrganizationDataFromDto(
        updateOrganizationDto
      )
    return await this.organizationsRepo.updateOrganization(
      updateOrganizationDto.orgId,
      updateOrganizationData,
      currentUser.userId
    )
  }
}
