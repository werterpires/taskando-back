import { Injectable } from '@nestjs/common'
import { CreateOrganizationDto } from './dto/create-organization.dto'
import { UpdateOrganizationDto } from './dto/update-organization.dto'
import { OrganizationsRepo } from './organizations.repo'
import { DepartmentsRepo } from '../departments/departments.repo'
import { TeamsRepo } from '../teams/teams.repo'
import { Department } from '../departments/types'
import { Team } from '../teams/types'
import { userRoleEnum } from '../constants/roles.enum'
import { OrganizationsHelper } from './organizations.helper'
import { ValidateUser } from '../shared/auth/types'
import { Paginator } from '../shared/types/paginator.types'
import { Response } from '../shared/types/response.types'
import { Organization } from './types'

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsRepo: OrganizationsRepo,
    private readonly organizationsHelper: OrganizationsHelper,
    private readonly departmentsRepo: DepartmentsRepo,
    private readonly teamsRepo: TeamsRepo
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

    // Roles permitidas para visualizar departments
    const allowedRoles = [
      userRoleEnum.LEADER,
      userRoleEnum.EDITOR,
      userRoleEnum.REVIEWER,
      userRoleEnum.EXECUTOR,
      userRoleEnum.CONTRIBUTOR
    ]
    const hasPermission =
      org.currentUserRoles?.some((role: string) =>
        allowedRoles.includes(role as userRoleEnum)
      ) || org.ownerId == currentUser.userId

    let departments: Department[] = []
    let teams: Team[] = []
    if (hasPermission) {
      // Busca todos os departments da organização para o usuário
      departments = await this.departmentsRepo.getAllByOrgIdAndUser(
        orgId,
        currentUser.userId,
        { limit: 20, offset: 0, orderBy: 'deptId', direction: 'ASC' }
      )
      // Busca todos os teams da organização para o usuário
      teams = await this.teamsRepo.getAllByOrgIdAndUser(
        orgId,
        currentUser.userId,
        { limit: 20, offset: 0, orderBy: 'teamId', direction: 'ASC' }
      )
    }
    return { ...org, departments, teams }
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
