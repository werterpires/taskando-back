import { Injectable } from '@nestjs/common'
import { ValidateUser } from '../shared/auth/types'
import { Paginator } from '../shared/types/paginator.types'
import { Response } from '../shared/types/response.types'
import { CreateOrganizationDto } from './dto/create-organization.dto'
import { UpdateOrganizationDto } from './dto/update-organization.dto'
import { OrganizationsHelper } from './organizations.helper'
import { Organization } from './types'
import { OrganizationsSimpleRepo } from './organizations-simple.repo'

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsRepo: OrganizationsSimpleRepo,
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

  async getAll(
    currentUser: ValidateUser,
    paginator: Paginator
  ): Promise<Response<Organization>> {
    const itens = await this.organizationsRepo.getAllByOwnerIdOrMember(
      currentUser.userId,
      paginator
    )
    const quantity = await this.organizationsRepo.countByOwnerIdOrMember(
      currentUser.userId
    )

    return {
      quantity,
      itens
    }
  }

  async findOne(
    orgId: number,
    currentUser: ValidateUser
  ): Promise<Organization | null> {
    const org = await this.organizationsRepo.getById(orgId, currentUser.userId)
    if (!org) return null

    return org
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

  async remove(orgId: number, currentUser: ValidateUser) {
    return await this.organizationsRepo.deleteOrganization(
      orgId,
      currentUser.userId
    )
  }
}
