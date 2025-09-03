import { Injectable } from '@nestjs/common'
import { CreateOrganizationDto } from './dto/create-organization.dto'
import { UpdateOrganizationDto } from './dto/update-organization.dto'
import { OrganizationsRepo } from './organizations.repo'
import { OrganizationsHelper } from './organizations.helper'
import { ValidateUser } from '../shared/auth/types'
import { Paginator } from '../shared/types/paginator.types'

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

  async getAll(currentUser: ValidateUser, paginator: Paginator) {
    return await this.organizationsRepo.getAllByOwnerId(
      currentUser.userId,
      paginator
    )
  }
}
