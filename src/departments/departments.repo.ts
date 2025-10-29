import { Injectable } from '@nestjs/common'
import { InjectConnection } from 'nest-knexjs'
import { Knex } from 'knex'
import { CreateDepartmentData, Department } from './types'
import {
  departments,
  users,
  organizations,
  organizationMembers,
  departmentMembers
} from '../constants/db'
import { Paginator } from '../shared/types/paginator.types'
import { userRoleEnum } from 'src/constants/roles.enum'

@Injectable()
export class DepartmentsRepo {
  private columns = departments.columns
  private usersColumns = users.columns
  private organizationsColumns = organizations.columns
  private organizationMembersColumns = organizationMembers.columns
  private departmentMembersColumns = departmentMembers.columns

  constructor(@InjectConnection('knexx') private readonly knex: Knex) {}

  async canUserCreateDepartmentInOrg(
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
    return role == userRoleEnum.LEADER || role === userRoleEnum.EDITOR
  }

  async createDepartment(
    createDepartmentData: CreateDepartmentData
  ): Promise<number[]> {
    return await this.knex(departments.name).insert(createDepartmentData)
  }

  async getAllByUserIdOrMember(
    userId: number,
    paginator: Paginator
  ): Promise<Department[]> {
    // Buscar departamentos únicos onde:
    // a) o usuário é owner do departamento OU é membro direto (LEADER, EDITOR, REVIEWER, EXECUTOR, CONTRIBUTOR ou WATCHER)
    // b) o departamento pertence a uma org onde o usuário é OWNER, LEADER, EDITOR, REVIEWER, EXECUTOR ou CONTRIBUTOR
    const departmentsDB = await this.knex(departments.name)
      .distinct([
        `${this.columns.id.completeName} as deptId`,
        `${this.columns.name.completeName} as name`,
        `${this.columns.organization.completeName} as orgId`,
        `${this.columns.owner.completeName} as ownerId`
      ])
      .where((builder) => {
        // Condição A1: Usuário é owner do departamento
        builder
          .where(this.columns.owner.completeName, userId)
          // Condição A2: Usuário é membro direto do departamento
          .orWhereExists((subquery) => {
            subquery
              .select('*')
              .from(departmentMembers.name)
              .whereRaw(
                `${this.departmentMembersColumns.departmentId.completeName} = ${this.columns.id.completeName}`
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
                userRoleEnum.CONTRIBUTOR,
                userRoleEnum.WATCHER
              ])
          })
          // Condição B: Departamento pertence a org onde usuário tem role adequado
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
          // Condição B2: Departamento pertence a org onde usuário é owner
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

    return departmentsDB as Department[]
  }

  async countByUserIdOrMember(userId: number): Promise<number> {
    const result = await this.knex(departments.name)
      .countDistinct(`${this.columns.id.completeName} as total`)
      .where((builder) => {
        // Condição A1: Usuário é owner do departamento
        builder
          .where(this.columns.owner.completeName, userId)
          // Condição A2: Usuário é membro direto do departamento
          .orWhereExists((subquery) => {
            subquery
              .select('*')
              .from(departmentMembers.name)
              .whereRaw(
                `${this.departmentMembersColumns.departmentId.completeName} = ${this.columns.id.completeName}`
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
                userRoleEnum.CONTRIBUTOR,
                userRoleEnum.WATCHER
              ])
          })
          // Condição B: Departamento pertence a org onde usuário tem role adequado
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
          // Condição B2: Departamento pertence a org onde usuário é owner
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
      .first()

    if (!result) return 0
    return parseInt(result.total as string, 10)
  }

  async getAllByOwnerId(
    userId: number,
    paginator: Paginator
  ): Promise<Department[]> {
    return await this.knex(departments.name)
      .select([
        this.columns.id.name,
        this.columns.name.name,
        this.columns.organization.name,
        this.columns.owner.name
      ])
      .where(this.columns.owner.name, userId)
      .orderBy(paginator.orderBy, paginator.direction)
      .limit(paginator.limit)
      .offset(paginator.offset)
  }

  async countByOwnerId(userId: number): Promise<number> {
    const result = await this.knex(departments.name)
      .count('* as total')
      .where(this.columns.owner.name, userId)
      .first()

    if (!result) return 0
    return parseInt(result.total as string, 10)
  }

  async getById(deptId: number, userId: number): Promise<Department | null> {
    // Verificar se o usuário tem permissão para ver o department
    const hasPermission = await this.knex(departments.name)
      .select(this.columns.id.completeName)
      .where(this.columns.id.completeName, deptId)
      .andWhere((builder) => {
        // Usuário é owner do departamento
        builder
          .where(this.columns.owner.completeName, userId)
          // Usuário é membro do departamento (qualquer role)
          .orWhereExists((subquery) => {
            subquery
              .select('*')
              .from(departmentMembers.name)
              .whereRaw(
                `${this.departmentMembersColumns.departmentId.completeName} = ${this.columns.id.completeName}`
              )
              .andWhere(
                this.departmentMembersColumns.userId.completeName,
                userId
              )
          })
          // Departamento pertence a org onde usuário tem role adequado
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
          // Departamento pertence a org onde usuário é owner
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
      .first()

    if (!hasPermission) return null

    // Buscar o department com todas as informações
    const result = await this.knex(departments.name)
      .select([
        `${this.columns.id.completeName} as deptId`,
        `${this.columns.name.completeName} as deptName`,
        `${this.columns.organization.completeName} as orgId`,
        `${this.columns.owner.completeName} as ownerId`,
        // Owner user data
        `${this.usersColumns.id.completeName} as ownerUserId`,
        `${this.usersColumns.email.completeName} as ownerEmail`,
        `${this.usersColumns.firstName.completeName} as ownerFirstName`,
        `${this.usersColumns.lastName.completeName} as ownerLastName`,
        // Organization data
        `${this.organizationsColumns.id.completeName} as orgIdFull`,
        `${this.organizationsColumns.name.completeName} as orgName`,
        `${this.organizationsColumns.cnpj.completeName} as orgCnpj`,
        `${this.organizationsColumns.address.completeName} as orgAddress`,
        `${this.organizationsColumns.phone.completeName} as orgPhone`,
        `${this.organizationsColumns.owner.completeName} as orgOwnerId`
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
      .where(this.columns.id.completeName, deptId)
      .first()

    if (!result) return null

    const department: Department = {
      deptId: result.deptId,
      name: result.deptName,
      orgId: result.orgId,
      ownerId: result.ownerId,
      owner: {
        userId: result.ownerUserId,
        email: result.ownerEmail,
        firstName: result.ownerFirstName,
        lastName: result.ownerLastName
      }
    }

    // Adicionar organization se existir
    if (result.orgIdFull) {
      department.organization = {
        orgId: result.orgIdFull,
        name: result.orgName,
        cnpj: result.orgCnpj,
        address: result.orgAddress,
        phone: result.orgPhone,
        ownerId: result.orgOwnerId
      }
    }

    return department
  }

  async updateDepartment(
    deptId: number,
    updateData: Partial<CreateDepartmentData>,
    ownerId: number
  ): Promise<number> {
    return await this.knex(departments.name)
      .where(this.columns.id.name, deptId)
      .andWhere(this.columns.owner.name, ownerId)
      .update(updateData)
  }

  async deleteDepartment(deptId: number, ownerId: number): Promise<number> {
    return await this.knex(departments.name)
      .where(this.columns.id.name, deptId)
      .andWhere(this.columns.owner.name, ownerId)
      .del()
  }

  //insira o novo método aqui
  async getAllByOrgIdAndUser(
    orgId: number,
    userId: number,
    paginator: Paginator
  ): Promise<Department[]> {
    const departmentsDB = await this.knex(departments.name)
      .distinct([
        `${this.columns.id.completeName}`,
        `${this.columns.name.completeName}`,
        `${this.columns.organization.completeName}`,
        `${this.columns.owner.completeName}`
      ])
      .where(this.columns.organization.completeName, orgId)
      .andWhere((builder) => {
        builder
          .where(this.columns.owner.completeName, userId)
          .orWhereExists((subquery) => {
            subquery
              .select('*')
              .from(departmentMembers.name)
              .whereRaw(
                `${this.departmentMembersColumns.departmentId.completeName} = ${this.columns.id.completeName}`
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

    return departmentsDB as Department[]
  }
}
