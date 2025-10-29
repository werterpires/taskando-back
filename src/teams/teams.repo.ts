import { Injectable } from '@nestjs/common'
import { InjectConnection } from 'nest-knexjs'
import { Knex } from 'knex'
import { CreateTeamData, Team } from './types'
import {
  teams,
  users,
  organizations,
  departments,
  organizationMembers,
  departmentMembers,
  teamMembers
} from '../constants/db'
import { Paginator } from '../shared/types/paginator.types'
import { userRoleEnum } from 'src/constants/roles.enum'

@Injectable()
export class TeamsRepo {
  private columns = teams.columns
  private usersColumns = users.columns
  private organizationsColumns = organizations.columns
  private departmentsColumns = departments.columns
  private organizationMembersColumns = organizationMembers.columns
  private departmentMembersColumns = departmentMembers.columns
  private teamMembersColumns = teamMembers.columns

  constructor(@InjectConnection('knexx') private readonly knex: Knex) {}

  async canUserCreateTeamInOrg(
    userId: number,
    orgId: number
  ): Promise<boolean> {
    // Verificar se é owner da organization
    const isOwner = await this.knex(organizations.name)
      .select(this.organizationsColumns.id.name)
      .where(this.organizationsColumns.id.name, orgId)
      .andWhere(this.organizationsColumns.owner.name, userId)
      .first()

    if (isOwner) return true

    // Verificar se é LEADER ou EDITOR da organization
    const memberRole = await this.knex(organizationMembers.name)
      .select(this.organizationMembersColumns.role.name)
      .where(this.organizationMembersColumns.userId.name, userId)
      .andWhere(this.organizationMembersColumns.orgId.name, orgId)
      .first()

    if (!memberRole) return false

    const role = memberRole[this.organizationMembersColumns.role.name]
    return role === userRoleEnum.LEADER || role === userRoleEnum.EDITOR
  }

  async canUserCreateTeamInDept(
    userId: number,
    deptId: number
  ): Promise<boolean> {
    // Verificar se é owner do department
    const isOwner = await this.knex(departments.name)
      .select(this.departmentsColumns.id.name)
      .where(this.departmentsColumns.id.name, deptId)
      .andWhere(this.departmentsColumns.owner.name, userId)
      .first()

    if (isOwner) return true

    // Verificar se é LEADER ou EDITOR do department
    const memberRole = await this.knex(departmentMembers.name)
      .select(this.departmentMembersColumns.role.name)
      .where(this.departmentMembersColumns.userId.name, userId)
      .andWhere(this.departmentMembersColumns.deptId.name, deptId)
      .first()

    if (!memberRole) return false

    const role = memberRole[this.departmentMembersColumns.role.name]
    return role === userRoleEnum.LEADER || role === userRoleEnum.EDITOR
  }

  async createTeam(createTeamData: CreateTeamData): Promise<number[]> {
    return await this.knex(teams.name).insert(createTeamData)
  }

  async updateTeam(
    teamId: number,
    updateData: Partial<CreateTeamData>,
    ownerId: number
  ): Promise<number> {
    return await this.knex(teams.name)
      .where(this.columns.id.name, teamId)
      .andWhere(this.columns.owner.name, ownerId)
      .update(updateData)
  }

  async deleteTeam(teamId: number, ownerId: number): Promise<number> {
    return await this.knex(teams.name)
      .where(this.columns.id.name, teamId)
      .andWhere(this.columns.owner.name, ownerId)
      .del()
  }

  async getById(teamId: number, userId: number): Promise<Team | null> {
    // Verificar se o usuário tem permissão para ver o team
    const hasPermission = await this.knex(teams.name)
      .select(this.columns.id.completeName)
      .where(this.columns.id.completeName, teamId)
      .andWhere((builder) => {
        // Usuário é owner do team
        builder
          .where(this.columns.owner.completeName, userId)
          // Usuário é membro do team (qualquer role)
          .orWhereExists((subquery) => {
            subquery
              .select('*')
              .from(teamMembers.name)
              .whereRaw(
                `${this.teamMembersColumns.teamId.completeName} = ${this.columns.id.completeName}`
              )
              .andWhere(this.teamMembersColumns.userId.completeName, userId)
          })
          // Team pertence a org onde usuário tem role adequado
          .orWhereExists((subquery) => {
            subquery
              .select('*')
              .from(organizationMembers.name)
              .whereRaw(
                `${this.organizationMembersColumns.orgId.completeName} = ${this.columns.organization.completeName}`
              )
              .andWhere(
                this.organizationMembersColumns.userId.completeName,
                userId
              )
              .whereIn(this.organizationMembersColumns.role.completeName, [
                userRoleEnum.LEADER,
                userRoleEnum.EDITOR,
                userRoleEnum.REVIEWER,
                userRoleEnum.EXECUTOR,
                userRoleEnum.CONTRIBUTOR
              ])
          })
          // Team pertence a org onde usuário é owner
          .orWhere((subBuilder) => {
            subBuilder
              .whereExists((subquery) => {
                subquery
                  .select('*')
                  .from(organizations.name)
                  .whereRaw(
                    `${this.organizationsColumns.id.completeName} = ${this.columns.organization.completeName}`
                  )
                  .andWhere(
                    this.organizationsColumns.owner.completeName,
                    userId
                  )
              })
              .whereNotNull(this.columns.organization.completeName)
          })
          // Team pertence a dept onde usuário é owner
          .orWhere((subBuilder) => {
            subBuilder
              .whereExists((subquery) => {
                subquery
                  .select('*')
                  .from(departments.name)
                  .whereRaw(
                    `${this.departmentsColumns.id.completeName} = ${this.columns.department.completeName}`
                  )
                  .andWhere(this.departmentsColumns.owner.completeName, userId)
              })
              .whereNotNull(this.columns.department.completeName)
          })
          // Team pertence a dept onde usuário é membro
          .orWhereExists((subquery) => {
            subquery
              .select('*')
              .from(departmentMembers.name)
              .whereRaw(
                `${this.departmentMembersColumns.deptId.completeName} = ${this.columns.department.completeName}`
              )
              .andWhere(
                this.departmentMembersColumns.userId.completeName,
                userId
              )
              .whereIn(this.departmentMembersColumns.role.completeName, [
                userRoleEnum.LEADER,
                userRoleEnum.EDITOR,
                userRoleEnum.REVIEWER,
                userRoleEnum.EXECUTOR,
                userRoleEnum.CONTRIBUTOR
              ])
          })
      })
      .first()

    if (!hasPermission) return null

    // Buscar o team com todas as informações
    const result = await this.knex(teams.name)
      .select([
        this.columns.id.completeName,
        this.columns.name.completeName,
        this.columns.department.completeName,
        this.columns.organization.completeName,
        this.columns.owner.completeName,
        // Owner user data
        this.usersColumns.id.completeName,
        this.usersColumns.email.completeName,
        this.usersColumns.firstName.completeName,
        this.usersColumns.lastName.completeName,
        // Organization data
        this.organizationsColumns.id.completeName,
        this.organizationsColumns.name.completeName,
        this.organizationsColumns.cnpj.completeName,
        this.organizationsColumns.address.completeName,
        this.organizationsColumns.phone.completeName,
        this.organizationsColumns.owner.completeName,
        // Department data
        this.departmentsColumns.id.completeName,
        this.departmentsColumns.name.completeName,
        this.departmentsColumns.organization.completeName,
        this.departmentsColumns.owner.completeName
      ])
      .leftJoin(
        users.name,
        this.columns.owner.completeName,
        this.usersColumns.id.completeName
      )
      .leftJoin(
        organizations.name,
        this.columns.organization.completeName,
        this.organizationsColumns.id.completeName
      )
      .leftJoin(
        departments.name,
        this.columns.department.completeName,
        this.departmentsColumns.id.completeName
      )
      .where(this.columns.id.completeName, teamId)
      .first()

    if (!result) return null

    const team: Team = {
      teamId: result.deptId,
      name: result.name,
      deptId: result.deptId,
      orgId: result.orgId,
      ownerId: result.ownerId,
      owner: {
        userId: result.userId,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName
      }
    }

    // Adicionar organization se existir
    if (result.orgId) {
      team.organization = {
        orgId: result.orgId,
        name: result.name,
        cnpj: result.cnpj,
        address: result.address,
        phone: result.phone,
        ownerId: result.ownerId
      }
    }

    // Adicionar department se existir
    if (result.deptId) {
      team.department = {
        deptId: result.deptId,
        name: result.name,
        orgId: result.orgId,
        ownerId: result.ownerId
      }
    }

    return team
  }

  async getAllByUserIdOrMember(
    userId: number,
    paginator: Paginator
  ): Promise<Team[]> {
    // Buscar teams únicos onde:
    // a) o usuário é owner do team OU é membro direto (LEADER, EDITOR, REVIEWER, EXECUTOR, CONTRIBUTOR ou WATCHER)
    // b) o team pertence a uma org onde o usuário é OWNER, LEADER, EDITOR, REVIEWER, EXECUTOR ou CONTRIBUTOR
    // c) o team pertence a um dept onde o usuário é owner ou membro com roles adequados
    const teamsDB = await this.knex(teams.name)
      .distinct([
        `${this.columns.id.completeName} as teamId`,
        `${this.columns.name.completeName} as name`,
        `${this.columns.department.completeName} as deptId`,
        `${this.columns.organization.completeName} as orgId`,
        `${this.columns.owner.completeName} as ownerId`
      ])
      .where((builder) => {
        // Condição A1: Usuário é owner do team
        builder
          .where(this.columns.owner.completeName, userId)
          // Condição A2: Usuário é membro direto do team
          .orWhereExists((subquery) => {
            subquery
              .select('*')
              .from(teamMembers.name)
              .whereRaw(
                `${this.teamMembersColumns.teamId.completeName} = ${this.columns.id.completeName}`
              )
              .andWhere(this.teamMembersColumns.userId.completeName, userId)
              .whereIn(this.teamMembersColumns.role.completeName, [
                userRoleEnum.LEADER,
                userRoleEnum.EDITOR,
                userRoleEnum.REVIEWER,
                userRoleEnum.EXECUTOR,
                userRoleEnum.CONTRIBUTOR,
                userRoleEnum.WATCHER
              ])
          })
          // Condição B: Team pertence a org onde usuário tem role adequado
          .orWhereExists((subquery) => {
            subquery
              .select('*')
              .from(organizationMembers.name)
              .whereRaw(
                `${this.organizationMembersColumns.orgId.completeName} = ${this.columns.organization.completeName}`
              )
              .andWhere(
                this.organizationMembersColumns.userId.completeName,
                userId
              )
              .whereIn(this.organizationMembersColumns.role.completeName, [
                userRoleEnum.LEADER,
                userRoleEnum.EDITOR,
                userRoleEnum.REVIEWER,
                userRoleEnum.EXECUTOR,
                userRoleEnum.CONTRIBUTOR
              ])
          })
          // Condição B2: Team pertence a org onde usuário é owner
          .orWhere((subBuilder) => {
            subBuilder
              .whereExists((subquery) => {
                subquery
                  .select('*')
                  .from(organizations.name)
                  .whereRaw(
                    `${this.organizationsColumns.id.completeName} = ${this.columns.organization.completeName}`
                  )
                  .andWhere(
                    this.organizationsColumns.owner.completeName,
                    userId
                  )
              })
              .whereNotNull(this.columns.organization.completeName)
          })
          // Condição C1: Team pertence a dept onde usuário é owner
          .orWhere((subBuilder) => {
            subBuilder
              .whereExists((subquery) => {
                subquery
                  .select('*')
                  .from(departments.name)
                  .whereRaw(
                    `${this.departmentsColumns.id.completeName} = ${this.columns.department.completeName}`
                  )
                  .andWhere(this.departmentsColumns.owner.completeName, userId)
              })
              .whereNotNull(this.columns.department.completeName)
          })
          // Condição C2: Team pertence a dept onde usuário é membro
          .orWhereExists((subquery) => {
            subquery
              .select('*')
              .from(departmentMembers.name)
              .whereRaw(
                `${this.departmentMembersColumns.deptId.completeName} = ${this.columns.department.completeName}`
              )
              .andWhere(
                this.departmentMembersColumns.userId.completeName,
                userId
              )
              .whereIn(this.departmentMembersColumns.role.completeName, [
                userRoleEnum.LEADER,
                userRoleEnum.EDITOR,
                userRoleEnum.REVIEWER,
                userRoleEnum.EXECUTOR,
                userRoleEnum.CONTRIBUTOR
              ])
          })
      })
      .orderBy(`${this.columns.id.completeName}`, paginator.direction)
      .limit(paginator.limit)
      .offset(paginator.offset)

    return teamsDB as Team[]
  }

  async countByUserIdOrMember(userId: number): Promise<number> {
    const result = await this.knex(teams.name)
      .countDistinct(`${this.columns.id.completeName} as total`)
      .where((builder) => {
        // Condição A1: Usuário é owner do team
        builder
          .where(this.columns.owner.completeName, userId)
          // Condição A2: Usuário é membro direto do team
          .orWhereExists((subquery) => {
            subquery
              .select('*')
              .from(teamMembers.name)
              .whereRaw(
                `${this.teamMembersColumns.teamId.completeName} = ${this.columns.id.completeName}`
              )
              .andWhere(this.teamMembersColumns.userId.completeName, userId)
              .whereIn(this.teamMembersColumns.role.completeName, [
                userRoleEnum.LEADER,
                userRoleEnum.EDITOR,
                userRoleEnum.REVIEWER,
                userRoleEnum.EXECUTOR,
                userRoleEnum.CONTRIBUTOR,
                userRoleEnum.WATCHER
              ])
          })
          // Condição B: Team pertence a org onde usuário tem role adequado
          .orWhereExists((subquery) => {
            subquery
              .select('*')
              .from(organizationMembers.name)
              .whereRaw(
                `${this.organizationMembersColumns.orgId.completeName} = ${this.columns.organization.completeName}`
              )
              .andWhere(
                this.organizationMembersColumns.userId.completeName,
                userId
              )
              .whereIn(this.organizationMembersColumns.role.completeName, [
                userRoleEnum.LEADER,
                userRoleEnum.EDITOR,
                userRoleEnum.REVIEWER,
                userRoleEnum.EXECUTOR,
                userRoleEnum.CONTRIBUTOR
              ])
          })
          // Condição B2: Team pertence a org onde usuário é owner
          .orWhere((subBuilder) => {
            subBuilder
              .whereExists((subquery) => {
                subquery
                  .select('*')
                  .from(organizations.name)
                  .whereRaw(
                    `${this.organizationsColumns.id.completeName} = ${this.columns.organization.completeName}`
                  )
                  .andWhere(
                    this.organizationsColumns.owner.completeName,
                    userId
                  )
              })
              .whereNotNull(this.columns.organization.completeName)
          })
          // Condição C1: Team pertence a dept onde usuário é owner
          .orWhere((subBuilder) => {
            subBuilder
              .whereExists((subquery) => {
                subquery
                  .select('*')
                  .from(departments.name)
                  .whereRaw(
                    `${this.departmentsColumns.id.completeName} = ${this.columns.department.completeName}`
                  )
                  .andWhere(this.departmentsColumns.owner.completeName, userId)
              })
              .whereNotNull(this.columns.department.completeName)
          })
          // Condição C2: Team pertence a dept onde usuário é membro
          .orWhereExists((subquery) => {
            subquery
              .select('*')
              .from(departmentMembers.name)
              .whereRaw(
                `${this.departmentMembersColumns.deptId.completeName} = ${this.columns.department.completeName}`
              )
              .andWhere(
                this.departmentMembersColumns.userId.completeName,
                userId
              )
              .whereIn(this.departmentMembersColumns.role.completeName, [
                userRoleEnum.LEADER,
                userRoleEnum.EDITOR,
                userRoleEnum.REVIEWER,
                userRoleEnum.EXECUTOR,
                userRoleEnum.CONTRIBUTOR
              ])
          })
      })
      .first()

    if (!result) return 0
    return parseInt(result.total as string, 10)
  }

  async getAllByOrgIdAndUser(
    orgId: number,
    userId: number,
    paginator: Paginator
  ): Promise<Team[]> {
    const teamsDB = await this.knex(teams.name)
      .distinct([
        `${this.columns.id.completeName} as teamId`,
        `${this.columns.name.completeName} as name`,
        `${this.columns.department.completeName} as deptId`,
        `${this.columns.organization.completeName} as orgId`,
        `${this.columns.owner.completeName} as ownerId`
      ])
      .where(this.columns.organization.completeName, orgId)
      .andWhere((builder) => {
        builder
          .where(this.columns.owner.completeName, userId)
          .orWhereExists((subquery) => {
            subquery
              .select('*')
              .from(teamMembers.name)
              .whereRaw(
                `${this.teamMembersColumns.teamId.completeName} = ${this.columns.id.completeName}`
              )
              .andWhere(this.teamMembersColumns.userId.completeName, userId)
              .whereIn(this.teamMembersColumns.role.completeName, [
                userRoleEnum.LEADER,
                userRoleEnum.EDITOR,
                userRoleEnum.REVIEWER,
                userRoleEnum.EXECUTOR,
                userRoleEnum.CONTRIBUTOR,
                userRoleEnum.WATCHER
              ])
          })
          .orWhereExists((subquery) => {
            subquery
              .select('*')
              .from(organizationMembers.name)
              .whereRaw(
                `${this.organizationMembersColumns.orgId.completeName} = ${this.columns.organization.completeName}`
              )
              .andWhere(
                this.organizationMembersColumns.userId.completeName,
                userId
              )
              .whereIn(this.organizationMembersColumns.role.completeName, [
                userRoleEnum.LEADER,
                userRoleEnum.EDITOR,
                userRoleEnum.REVIEWER,
                userRoleEnum.EXECUTOR,
                userRoleEnum.CONTRIBUTOR
              ])
          })
          .orWhere((subBuilder) => {
            subBuilder
              .whereExists((subquery) => {
                subquery
                  .select('*')
                  .from(organizations.name)
                  .whereRaw(
                    `${this.organizationsColumns.id.completeName} = ${this.columns.organization.completeName}`
                  )
                  .andWhere(
                    this.organizationsColumns.owner.completeName,
                    userId
                  )
              })
              .whereNotNull(this.columns.organization.completeName)
          })
      })
      .orderBy(`${this.columns.id.completeName}`, paginator.direction)
      .limit(paginator.limit)
      .offset(paginator.offset)

    return teamsDB as Team[]
  }

  async getAllByDeptIdAndUser(
    deptId: number,
    userId: number,
    paginator: Paginator
  ): Promise<Team[]> {
    const teamsDB = await this.knex(teams.name)
      .distinct([
        `${this.columns.id.completeName} as teamId`,
        `${this.columns.name.completeName} as name`,
        `${this.columns.department.completeName} as deptId`,
        `${this.columns.organization.completeName} as orgId`,
        `${this.columns.owner.completeName} as ownerId`
      ])
      .where(this.columns.department.completeName, deptId)
      .andWhere((builder) => {
        builder
          .where(this.columns.owner.completeName, userId)
          .orWhereExists((subquery) => {
            subquery
              .select('*')
              .from(teamMembers.name)
              .whereRaw(
                `${this.teamMembersColumns.teamId.completeName} = ${this.columns.id.completeName}`
              )
              .andWhere(this.teamMembersColumns.userId.completeName, userId)
              .whereIn(this.teamMembersColumns.role.completeName, [
                userRoleEnum.LEADER,
                userRoleEnum.EDITOR,
                userRoleEnum.REVIEWER,
                userRoleEnum.EXECUTOR,
                userRoleEnum.CONTRIBUTOR,
                userRoleEnum.WATCHER
              ])
          })
          .orWhereExists((subquery) => {
            subquery
              .select('*')
              .from(departmentMembers.name)
              .whereRaw(
                `${this.departmentMembersColumns.deptId.completeName} = ${this.columns.department.completeName}`
              )
              .andWhere(
                this.departmentMembersColumns.userId.completeName,
                userId
              )
              .whereIn(this.departmentMembersColumns.role.completeName, [
                userRoleEnum.LEADER,
                userRoleEnum.EDITOR,
                userRoleEnum.REVIEWER,
                userRoleEnum.EXECUTOR,
                userRoleEnum.CONTRIBUTOR
              ])
          })
          .orWhere((subBuilder) => {
            subBuilder
              .whereExists((subquery) => {
                subquery
                  .select('*')
                  .from(departments.name)
                  .whereRaw(
                    `${this.departmentsColumns.id.completeName} = ${this.columns.department.completeName}`
                  )
                  .andWhere(this.departmentsColumns.owner.completeName, userId)
              })
              .whereNotNull(this.columns.department.completeName)
          })
      })
      .orderBy(`${this.columns.id.completeName}`, paginator.direction)
      .limit(paginator.limit)
      .offset(paginator.offset)

    return teamsDB as Team[]
  }
}
