import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { CreateDepartmentData, Department as DepartmentType } from './types'
import { Department } from './entities/department.entity'
import { DepartmentMember } from './entities/department-member.entity'
import { Organization } from '../organizations/entities/organization.entity'
import { OrganizationMember } from '../organizations-members/entities/organization-member.entity'
import { Paginator } from '../shared/types/paginator.types'
import { userRoleEnum } from 'src/constants/roles.enum'

@Injectable()
export class DepartmentsRepo {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(DepartmentMember)
    private readonly departmentMemberRepository: Repository<DepartmentMember>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepository: Repository<OrganizationMember>
  ) {}

  async canUserCreateDepartmentInOrg(
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

  async createDepartment(
    createDepartmentData: CreateDepartmentData
  ): Promise<Department> {
    const department = this.departmentRepository.create(createDepartmentData)
    return await this.departmentRepository.save(department)
  }

  async getAllByUserIdOrMember(
    userId: number,
    paginator: Paginator
  ): Promise<DepartmentType[]> {
    // 1. Buscar IDs dos departamentos que o usuário tem acesso
    const memberDeptIds = await this.departmentMemberRepository
      .find({
        where: { userId, active: true },
        select: ['departmentId']
      })
      .then((members) => members.map((m) => m.departmentId))

    const ownedDeptIds = await this.departmentRepository
      .find({
        where: { ownerId: userId },
        select: ['deptId']
      })
      .then((depts) => depts.map((d) => d.deptId))

    // IDs dos departamentos via membership em organizações
    const orgMemberDeptIds = await this.organizationMemberRepository
      .find({
        where: {
          userId,
          active: true,
          role: In([
            userRoleEnum.LEADER,
            userRoleEnum.EDITOR,
            userRoleEnum.REVIEWER,
            userRoleEnum.EXECUTOR,
            userRoleEnum.CONTRIBUTOR
          ])
        },
        select: ['orgId']
      })
      .then(async (orgMembers) => {
        if (orgMembers.length === 0) return []

        const orgIds = orgMembers.map((om) => om.orgId)
        return this.departmentRepository
          .find({
            where: { orgId: In(orgIds) },
            select: ['deptId']
          })
          .then((depts) => depts.map((d) => d.deptId))
      })

    // IDs dos departamentos via ownership de organizações
    const ownedOrgDeptIds = await this.organizationRepository
      .find({
        where: { ownerId: userId },
        select: ['orgId']
      })
      .then(async (ownedOrgs) => {
        if (ownedOrgs.length === 0) return []

        const orgIds = ownedOrgs.map((o) => o.orgId)
        return this.departmentRepository
          .find({
            where: { orgId: In(orgIds) },
            select: ['deptId']
          })
          .then((depts) => depts.map((d) => d.deptId))
      })

    const allDeptIds = [
      ...new Set([
        ...memberDeptIds,
        ...ownedDeptIds,
        ...orgMemberDeptIds,
        ...ownedOrgDeptIds
      ])
    ]

    if (allDeptIds.length === 0) {
      return []
    }

    // 2. Buscar departamentos
    const departments = await this.departmentRepository.find({
      where: { deptId: In(allDeptIds) },
      order: { [paginator.orderBy]: paginator.direction },
      skip: paginator.offset,
      take: paginator.limit
    })

    return departments.map((dept) => ({
      deptId: dept.deptId,
      name: dept.name,
      orgId: dept.orgId,
      ownerId: dept.ownerId
    }))
  }

  async countByUserIdOrMember(userId: number): Promise<number> {
    // Versão simplificada do count - reutiliza a lógica do getAllByUserIdOrMember
    const memberDeptIds = await this.departmentMemberRepository
      .find({
        where: { userId, active: true },
        select: ['departmentId']
      })
      .then((members) => members.map((m) => m.departmentId))

    const ownedDeptIds = await this.departmentRepository
      .find({
        where: { ownerId: userId },
        select: ['deptId']
      })
      .then((depts) => depts.map((d) => d.deptId))

    const orgMemberDeptIds = await this.organizationMemberRepository
      .find({
        where: {
          userId,
          active: true,
          role: In([
            userRoleEnum.LEADER,
            userRoleEnum.EDITOR,
            userRoleEnum.REVIEWER,
            userRoleEnum.EXECUTOR,
            userRoleEnum.CONTRIBUTOR
          ])
        },
        select: ['orgId']
      })
      .then(async (orgMembers) => {
        if (orgMembers.length === 0) return []

        const orgIds = orgMembers.map((om) => om.orgId)
        return this.departmentRepository
          .find({
            where: { orgId: In(orgIds) },
            select: ['deptId']
          })
          .then((depts) => depts.map((d) => d.deptId))
      })

    const ownedOrgDeptIds = await this.organizationRepository
      .find({
        where: { ownerId: userId },
        select: ['orgId']
      })
      .then(async (ownedOrgs) => {
        if (ownedOrgs.length === 0) return []

        const orgIds = ownedOrgs.map((o) => o.orgId)
        return this.departmentRepository
          .find({
            where: { orgId: In(orgIds) },
            select: ['deptId']
          })
          .then((depts) => depts.map((d) => d.deptId))
      })

    const allDeptIds = [
      ...new Set([
        ...memberDeptIds,
        ...ownedDeptIds,
        ...orgMemberDeptIds,
        ...ownedOrgDeptIds
      ])
    ]

    return allDeptIds.length
  }

  async getAllByOwnerId(
    userId: number,
    paginator: Paginator
  ): Promise<DepartmentType[]> {
    const departments = await this.departmentRepository.find({
      where: { ownerId: userId },
      select: ['deptId', 'name', 'orgId', 'ownerId'],
      order: { [paginator.orderBy]: paginator.direction },
      skip: paginator.offset,
      take: paginator.limit
    })

    return departments.map((dept) => ({
      deptId: dept.deptId,
      name: dept.name,
      orgId: dept.orgId,
      ownerId: dept.ownerId
    }))
  }

  async countByOwnerId(userId: number): Promise<number> {
    return await this.departmentRepository.count({
      where: { ownerId: userId }
    })
  }

  async getById(
    deptId: number,
    userId: number
  ): Promise<DepartmentType | null> {
    // Buscar o department com relacionamentos
    const department = await this.departmentRepository.findOne({
      where: { deptId },
      relations: {
        owner: true,
        organization: true
      }
    })

    if (!department) return null

    // Verificar se o usuário tem acesso
    const isOwner = department.ownerId === userId

    const isMember = await this.departmentMemberRepository.findOne({
      where: { userId, departmentId: deptId, active: true }
    })

    let hasOrgAccess = false
    if (department.organization) {
      const isOrgOwner = department.organization.ownerId === userId
      const orgMember = await this.organizationMemberRepository.findOne({
        where: { userId, orgId: department.orgId, active: true }
      })
      hasOrgAccess = isOrgOwner || !!orgMember
    }

    if (!isOwner && !isMember && !hasOrgAccess) return null

    const result: DepartmentType = {
      deptId: department.deptId,
      name: department.name,
      orgId: department.orgId,
      ownerId: department.ownerId,
      owner: department.owner
        ? {
            userId: department.owner.id,
            email: department.owner.email,
            firstName: department.owner.firstName,
            lastName: department.owner.lastName
          }
        : undefined
    }

    // Adicionar organization se existir
    if (department.organization) {
      result.organization = {
        orgId: department.organization.orgId,
        name: department.organization.name,
        cnpj: department.organization.cnpj,
        address: department.organization.address,
        phone: department.organization.phone,
        ownerId: department.organization.ownerId
      }
    }

    return result
  }

  async updateDepartment(
    deptId: number,
    updateData: Partial<CreateDepartmentData>,
    ownerId: number
  ): Promise<number> {
    const result = await this.departmentRepository.update(
      { deptId, ownerId },
      updateData
    )
    return result.affected || 0
  }

  async deleteDepartment(deptId: number, ownerId: number): Promise<number> {
    const result = await this.departmentRepository.delete({ deptId, ownerId })
    return result.affected || 0
  }

  async getAllByOrgIdAndUser(
    orgId: number,
    userId: number,
    paginator: Paginator
  ): Promise<DepartmentType[]> {
    // Abordagem mais simples e robusta: primeiro verificar acesso, depois buscar departamentos

    // 1. Verificar se usuário tem acesso à organização
    const hasAccess = await this.organizationRepository.findOne({
      where: { orgId, ownerId: userId }
    })

    const isMember = !hasAccess
      ? await this.organizationMemberRepository.findOne({
          where: {
            userId,
            orgId,
            active: true,
            role: In([
              userRoleEnum.LEADER,
              userRoleEnum.EDITOR,
              userRoleEnum.REVIEWER,
              userRoleEnum.EXECUTOR,
              userRoleEnum.CONTRIBUTOR
            ])
          }
        })
      : null

    if (!hasAccess && !isMember) {
      return []
    }

    // 2. Buscar departamentos da organização
    const departments = await this.departmentRepository.find({
      where: { orgId },
      order: { [paginator.orderBy]: paginator.direction },
      skip: paginator.offset,
      take: paginator.limit
    })

    return departments.map((dept) => ({
      deptId: dept.deptId,
      name: dept.name,
      orgId: dept.orgId,
      ownerId: dept.ownerId
    }))
  }
}
