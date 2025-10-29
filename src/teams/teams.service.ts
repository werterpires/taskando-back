import { Injectable, ForbiddenException } from '@nestjs/common'
import { CreateTeamDto } from './dto/create-team.dto'
import { UpdateTeamDto } from './dto/update-team.dto'
import { TeamsRepo } from './teams.repo'
import { TeamsHelper } from './teams.helper'
import { ValidateUser } from '../shared/auth/types'
import { Paginator } from '../shared/types/paginator.types'
import { Response } from '../shared/types/response.types'
import { Team } from './types'

@Injectable()
export class TeamsService {
  constructor(
    private readonly teamsRepo: TeamsRepo,
    private readonly teamsHelper: TeamsHelper
  ) {}

  async create(createTeamDto: CreateTeamDto, currentUser: ValidateUser) {
    // Validar permissões se um pai foi informado
    if (createTeamDto.orgId) {
      const canCreate = await this.teamsRepo.canUserCreateTeamInOrg(
        currentUser.userId,
        createTeamDto.orgId
      )

      if (!canCreate) {
        throw new ForbiddenException(
          'You must be the owner, leader, or editor of the organization to create a team'
        )
      }
    }

    if (createTeamDto.deptId) {
      const canCreate = await this.teamsRepo.canUserCreateTeamInDept(
        currentUser.userId,
        createTeamDto.deptId
      )

      if (!canCreate) {
        throw new ForbiddenException(
          'You must be the owner, leader, or editor of the department to create a team'
        )
      }
    }

    const createTeamData = this.teamsHelper.makeCreateTeamDataFromDto(
      createTeamDto,
      currentUser
    )

    return await this.teamsRepo.createTeam(createTeamData)
  }

  async getAll(
    currentUser: ValidateUser,
    paginator: Paginator
  ): Promise<Response<Team>> {
    const itens = await this.teamsRepo.getAllByUserIdOrMember(
      currentUser.userId,
      paginator
    )
    const quantity = await this.teamsRepo.countByUserIdOrMember(
      currentUser.userId
    )

    return {
      quantity,
      itens
    }
  }

  async findAllByOrgId(
    orgId: number,
    currentUser: ValidateUser,
    paginator: Paginator
  ): Promise<Response<Team>> {
    const itens = await this.teamsRepo.getAllByOrgIdAndUser(
      orgId,
      currentUser.userId,
      paginator
    )
    return {
      quantity: itens.length,
      itens
    }
  }

  async findAllByDeptId(
    deptId: number,
    currentUser: ValidateUser,
    paginator: Paginator
  ): Promise<Response<Team>> {
    const itens = await this.teamsRepo.getAllByDeptIdAndUser(
      deptId,
      currentUser.userId,
      paginator
    )
    return {
      quantity: itens.length,
      itens
    }
  }

  async findOne(
    teamId: number,
    currentUser: ValidateUser
  ): Promise<Team | null> {
    return await this.teamsRepo.getById(teamId, currentUser.userId)
  }

  async update(updateTeamDto: UpdateTeamDto, currentUser: ValidateUser) {
    const updateTeamData =
      this.teamsHelper.makeUpdateTeamDataFromDto(updateTeamDto)

    return await this.teamsRepo.updateTeam(
      updateTeamDto.teamId,
      updateTeamData,
      currentUser.userId
    )
  }

  async delete(teamId: number, currentUser: ValidateUser) {
    // Só o owner pode deletar
    const deleted = await this.teamsRepo.deleteTeam(teamId, currentUser.userId)
    if (!deleted) {
      throw new ForbiddenException('Only the owner can delete this team')
    }
    return { deleted }
  }
}
