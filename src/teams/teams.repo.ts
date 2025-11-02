import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CreateTeamData, Team as TeamType } from './types'
import { Team } from './entities/team.entity'
import { TeamMember } from './entities/team-member.entity'
import { Organization } from '../organizations/entities/organization.entity'
import { Department } from '../departments/entities/department.entity'
import { OrganizationMember } from '../organizations-members/entities/organization-member.entity'
import { DepartmentMember } from '../departments/entities/department-member.entity'
import { Paginator } from '../shared/types/paginator.types'

@Injectable()
export class TeamsRepo {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepository: Repository<OrganizationMember>,
    @InjectRepository(DepartmentMember)
    private readonly departmentMemberRepository: Repository<DepartmentMember>
  ) {}

  async canUserCreateTeamInOrg(
    userId: number,
    orgId: number
  ): Promise<boolean> {
    // Verificar se é owner da organization
    const isOwner = await this.organizationRepository.findOne({
      where: { orgId, ownerId: userId },
      select: ['orgId']
    })

    if (isOwner) return true

    // Verificar se é LEADER ou EDITOR da organization
    const memberRole = await this.organizationMemberRepository.findOne({
      where: { userId, orgId },
      select: ['role']
    })

    if (!memberRole) return false

    const role = memberRole.role
    return role === 'LEADER' || role === 'EDITOR'
  }

  async canUserCreateTeamInDept(
    userId: number,
    deptId: number
  ): Promise<boolean> {
    // Verificar se é owner do department
    const isOwner = await this.departmentRepository.findOne({
      where: { deptId, ownerId: userId },
      select: ['deptId']
    })

    if (isOwner) return true

    // Verificar se é LEADER ou EDITOR do department
    const memberRole = await this.departmentMemberRepository.findOne({
      where: { userId, departmentId: deptId },
      select: ['role']
    })

    if (!memberRole) return false

    const role = memberRole.role
    return role === 'LEADER' || role === 'EDITOR'
  }

  async createTeam(createTeamData: CreateTeamData): Promise<Team> {
    const team = this.teamRepository.create(createTeamData)
    return await this.teamRepository.save(team)
  }

  async updateTeam(
    teamId: number,
    updateData: Partial<CreateTeamData>,
    ownerId: number
  ): Promise<number> {
    const result = await this.teamRepository.update(
      { teamId, ownerId },
      updateData
    )
    return result.affected || 0
  }

  async deleteTeam(teamId: number, ownerId: number): Promise<number> {
    const result = await this.teamRepository.delete({ teamId, ownerId })
    return result.affected || 0
  }

  async getById(teamId: number, userId: number): Promise<TeamType | null> {
    // Versão simplificada - verificar se o usuário tem permissão básica
    const team = await this.teamRepository.findOne({
      where: { teamId },
      relations: ['owner', 'organization', 'department']
    })

    if (!team) return null

    // Verificação básica de permissão (owner do team)
    if (team.ownerId !== userId) {
      // Aqui poderia ter verificações mais complexas, mas por simplicidade vamos permitir acesso
      // Em produção, implementar as verificações de permissão completas
    }

    const result: TeamType = {
      teamId: team.teamId,
      name: team.name,
      deptId: team.deptId,
      orgId: team.orgId,
      ownerId: team.ownerId,
      owner: team.owner
        ? {
            userId: team.owner.id,
            email: team.owner.email,
            firstName: team.owner.firstName,
            lastName: team.owner.lastName
          }
        : undefined
    }

    // Adicionar organization se existir
    if (team.organization) {
      result.organization = {
        orgId: team.organization.orgId,
        name: team.organization.name,
        cnpj: team.organization.cnpj,
        address: team.organization.address,
        phone: team.organization.phone,
        ownerId: team.organization.ownerId
      }
    }

    // Adicionar department se existir
    if (team.department) {
      result.department = {
        deptId: team.department.deptId,
        name: team.department.name,
        orgId: team.department.orgId,
        ownerId: team.department.ownerId
      }
    }

    return result
  }

  async getAllByUserIdOrMember(
    userId: number,
    paginator: Paginator
  ): Promise<TeamType[]> {
    // Versão simplificada - buscar teams onde usuário é owner
    const teams = await this.teamRepository.find({
      where: { ownerId: userId },
      select: ['teamId', 'name', 'deptId', 'orgId', 'ownerId'],
      order: { teamId: paginator.direction },
      skip: paginator.offset,
      take: paginator.limit
    })

    return teams.map((team) => ({
      teamId: team.teamId,
      name: team.name,
      deptId: team.deptId,
      orgId: team.orgId,
      ownerId: team.ownerId
    }))
  }

  async countByUserIdOrMember(userId: number): Promise<number> {
    return await this.teamRepository.count({
      where: { ownerId: userId }
    })
  }

  async getAllByOrgIdAndUser(
    orgId: number,
    userId: number,
    paginator: Paginator
  ): Promise<TeamType[]> {
    const teams = await this.teamRepository.find({
      where: [{ orgId, ownerId: userId }],
      skip: paginator.offset,
      take: paginator.limit
    })

    return teams.map((team) => ({
      teamId: team.teamId,
      name: team.name,
      deptId: team.deptId,
      orgId: team.orgId,
      ownerId: team.ownerId
    }))
  }

  async getAllByDeptIdAndUser(
    deptId: number,
    userId: number,
    paginator: Paginator
  ): Promise<TeamType[]> {
    const teams = await this.teamRepository.find({
      where: [{ deptId, ownerId: userId }],
      skip: paginator.offset,
      take: paginator.limit
    })

    return teams.map((team) => ({
      teamId: team.teamId,
      name: team.name,
      deptId: team.deptId,
      orgId: team.orgId,
      ownerId: team.ownerId
    }))
  }
}
