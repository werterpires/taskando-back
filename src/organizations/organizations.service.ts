import { Injectable } from '@nestjs/common';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsRepo } from './organizations.repo';
import { OrganizationsHelper } from './organizations.helper';
import { ValidateUser } from '../shared/auth/types';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsRepo: OrganizationsRepo,
    private readonly organizationsHelper: OrganizationsHelper
  ) {}

  async create(createOrganizationDto: CreateOrganizationDto, currentUser: ValidateUser) {
    const createOrganizationData =
      this.organizationsHelper.makeCreateOrganizationDataFromDto(createOrganizationDto, currentUser)
    return await this.organizationsRepo.createOrganization(createOrganizationData)
  }

  findAll() {
    return `This action returns all organizations`;
  }

  findOne(id: number) {
    return `This action returns a #${id} organization`;
  }

  update(id: number, updateOrganizationDto: UpdateOrganizationDto) {
    return `This action updates a #${id} organization`;
  }

  remove(id: number) {
    return `This action removes a #${id} organization`;
  }
}
