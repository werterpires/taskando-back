// ...existing code...
import { Injectable, ForbiddenException } from '@nestjs/common'
import { CreateDepartmentDto } from './dto/create-department.dto'
import { UpdateDepartmentDto } from './dto/update-department.dto'
import { DepartmentsRepo } from './departments.repo'
import { DepartmentsHelper } from './departments.helper'
import { ValidateUser } from '../shared/auth/types'
import { Paginator } from '../shared/types/paginator.types'
import { Response } from '../shared/types/response.types'
import { Department } from './types'
import { TeamsRepo } from '../teams/teams.repo'

@Injectable()
export class DepartmentsService {
  async findAllByOrgId(
    orgId: number,
    currentUser: ValidateUser,
    paginator: Paginator
  ): Promise<Response<Department>> {
    const itens = await this.departmentsRepo.getAllByOrgIdAndUser(
      orgId,
      currentUser.userId,
      paginator
    )
    return {
      quantity: itens.length,
      itens
    }
  }
  async delete(deptId: number, currentUser: ValidateUser) {
    // Só o owner pode deletar
    const deleted = await this.departmentsRepo.deleteDepartment(
      deptId,
      currentUser.userId
    )
    if (!deleted) {
      throw new ForbiddenException('Only the owner can delete this department')
    }
    return { deleted }
  }
  constructor(
    private readonly departmentsRepo: DepartmentsRepo,
    private readonly departmentsHelper: DepartmentsHelper,
    private readonly teamsRepo: TeamsRepo
  ) {}

  async create(
    createDepartmentDto: CreateDepartmentDto,
    currentUser: ValidateUser
  ) {
    // Se orgId foi fornecido, validar permissões
    if (createDepartmentDto.orgId) {
      const canCreate = await this.departmentsRepo.canUserCreateDepartmentInOrg(
        currentUser.userId,
        createDepartmentDto.orgId
      )

      if (!canCreate) {
        throw new ForbiddenException(
          'You must be the owner, leader, or editor of the organization to create a department'
        )
      }
    }

    const createDepartmentData =
      this.departmentsHelper.makeCreateDepartmentDataFromDto(
        createDepartmentDto,
        currentUser
      )

    return await this.departmentsRepo.createDepartment(createDepartmentData)
  }

  async getAll(
    currentUser: ValidateUser,
    paginator: Paginator
  ): Promise<Response<Department>> {
    const itens = await this.departmentsRepo.getAllByUserIdOrMember(
      currentUser.userId,
      paginator
    )
    const quantity = await this.departmentsRepo.countByUserIdOrMember(
      currentUser.userId
    )

    return {
      quantity,
      itens
    }
  }

  async findOne(
    deptId: number,
    currentUser: ValidateUser
  ): Promise<Department | null> {
    const dept = await this.departmentsRepo.getById(deptId, currentUser.userId)
    if (!dept) return null

    // Buscar teams diretos do departamento visíveis ao usuário atual
    const teams = await this.teamsRepo.getAllByDeptIdAndUser(
      deptId,
      currentUser.userId,
      { limit: 20, offset: 0, orderBy: 'teamId', direction: 'ASC' }
    )

    return { ...dept, teams }
  }

  async update(
    updateDepartmentDto: UpdateDepartmentDto,
    currentUser: ValidateUser
  ) {
    const updateDepartmentData =
      this.departmentsHelper.makeUpdateDepartmentDataFromDto(
        updateDepartmentDto
      )

    return await this.departmentsRepo.updateDepartment(
      updateDepartmentDto.deptId,
      updateDepartmentData,
      currentUser.userId
    )
  }
}
