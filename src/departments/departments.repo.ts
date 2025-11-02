import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
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
    const queryBuilder = this.departmentRepository.createQueryBuilder('dept')

    queryBuilder
      .select(['dept.deptId', 'dept.name', 'dept.orgId', 'dept.ownerId'])
      .where('dept.ownerId = :userId', { userId })
      .orWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('1')
          .from(DepartmentMember, 'dm')
          .where('dm.departmentId = dept.deptId')
          .andWhere('dm.userId = :userId')
          .andWhere('dm.role IN (:...roles)')
          .getQuery()
        return `EXISTS (${subQuery})`
      })
      .orWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('1')
          .from(OrganizationMember, 'om')
          .where('om.orgId = dept.orgId')
          .andWhere('om.userId = :userId')
          .andWhere('om.role IN (:...orgRoles)')
          .getQuery()
        return `EXISTS (${subQuery})`
      })
      .orWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('1')
          .from(Organization, 'org')
          .where('org.orgId = dept.orgId')
          .andWhere('org.ownerId = :userId')
          .getQuery()
        return `EXISTS (${subQuery})`
      })
      .setParameters({
        userId,
        roles: [
          userRoleEnum.LEADER,
          userRoleEnum.EDITOR,
          userRoleEnum.REVIEWER,
          userRoleEnum.EXECUTOR,
          userRoleEnum.CONTRIBUTOR,
          userRoleEnum.WATCHER
        ],
        orgRoles: [
          userRoleEnum.LEADER,
          userRoleEnum.EDITOR,
          userRoleEnum.REVIEWER,
          userRoleEnum.EXECUTOR,
          userRoleEnum.CONTRIBUTOR
        ]
      })
      .orderBy('dept.deptId', paginator.direction as 'ASC' | 'DESC')
      .skip(paginator.offset)
      .take(paginator.limit)

    const departments = await queryBuilder.getMany()

    return departments.map((dept) => ({
      deptId: dept.deptId,
      name: dept.name,
      orgId: dept.orgId,
      ownerId: dept.ownerId
    }))
  }

  async countByUserIdOrMember(userId: number): Promise<number> {
    const queryBuilder = this.departmentRepository.createQueryBuilder('dept')

    const count = await queryBuilder
      .where('dept.ownerId = :userId', { userId })
      .orWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('1')
          .from(DepartmentMember, 'dm')
          .where('dm.departmentId = dept.deptId')
          .andWhere('dm.userId = :userId')
          .andWhere('dm.role IN (:...roles)')
          .getQuery()
        return `EXISTS (${subQuery})`
      })
      .orWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('1')
          .from(OrganizationMember, 'om')
          .where('om.orgId = dept.orgId')
          .andWhere('om.userId = :userId')
          .andWhere('om.role IN (:...orgRoles)')
          .getQuery()
        return `EXISTS (${subQuery})`
      })
      .orWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('1')
          .from(Organization, 'org')
          .where('org.orgId = dept.orgId')
          .andWhere('org.ownerId = :userId')
          .getQuery()
        return `EXISTS (${subQuery})`
      })
      .setParameters({
        userId,
        roles: [
          userRoleEnum.LEADER,
          userRoleEnum.EDITOR,
          userRoleEnum.REVIEWER,
          userRoleEnum.EXECUTOR,
          userRoleEnum.CONTRIBUTOR,
          userRoleEnum.WATCHER
        ],
        orgRoles: [
          userRoleEnum.LEADER,
          userRoleEnum.EDITOR,
          userRoleEnum.REVIEWER,
          userRoleEnum.EXECUTOR,
          userRoleEnum.CONTRIBUTOR
        ]
      })
      .getCount()

    return count
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
    // Verificar se o usuário tem permissão (versão simplificada)
    const queryBuilder = this.departmentRepository.createQueryBuilder('dept')

    const hasPermission = await queryBuilder
      .where('dept.deptId = :deptId', { deptId })
      .andWhere((qb) => {
        qb.where('dept.ownerId = :userId', { userId })
          .orWhere((subQb) => {
            const subQuery = subQb
              .subQuery()
              .select('1')
              .from(DepartmentMember, 'dm')
              .where('dm.departmentId = :deptId')
              .andWhere('dm.userId = :userId')
              .getQuery()
            return `EXISTS (${subQuery})`
          })
          .orWhere((subQb) => {
            const subQuery = subQb
              .subQuery()
              .select('1')
              .from(OrganizationMember, 'om')
              .where('om.orgId = dept.orgId')
              .andWhere('om.userId = :userId')
              .andWhere('om.role IN (:...roles)')
              .getQuery()
            return `EXISTS (${subQuery})`
          })
          .orWhere((subQb) => {
            const subQuery = subQb
              .subQuery()
              .select('1')
              .from(Organization, 'org')
              .where('org.orgId = dept.orgId')
              .andWhere('org.ownerId = :userId')
              .getQuery()
            return `EXISTS (${subQuery})`
          })
      })
      .setParameters({
        deptId,
        userId,
        roles: [
          userRoleEnum.LEADER,
          userRoleEnum.EDITOR,
          userRoleEnum.REVIEWER,
          userRoleEnum.EXECUTOR,
          userRoleEnum.CONTRIBUTOR
        ]
      })
      .getOne()

    if (!hasPermission) return null

    // Buscar o department com relacionamentos
    const department = await this.departmentRepository.findOne({
      where: { deptId },
      relations: ['owner', 'organization']
    })

    if (!department) return null

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
    const queryBuilder = this.departmentRepository.createQueryBuilder('dept')

    const departments = await queryBuilder
      .select(['dept.deptId', 'dept.name', 'dept.orgId', 'dept.ownerId'])
      .where('dept.orgId = :orgId', { orgId })
      .andWhere((qb) => {
        qb.where('dept.ownerId = :userId', { userId })
          .orWhere((subQb) => {
            const subQuery = subQb
              .subQuery()
              .select('1')
              .from(DepartmentMember, 'dm')
              .where('dm.departmentId = dept.deptId')
              .andWhere('dm.userId = :userId')
              .andWhere('dm.role IN (:...roles)')
              .getQuery()
            return `EXISTS (${subQuery})`
          })
          .orWhere((subQb) => {
            const subQuery = subQb
              .subQuery()
              .select('1')
              .from(OrganizationMember, 'om')
              .where('om.orgId = :orgId')
              .andWhere('om.userId = :userId')
              .andWhere('om.role IN (:...orgRoles)')
              .getQuery()
            return `EXISTS (${subQuery})`
          })
          .orWhere((subQb) => {
            const subQuery = subQb
              .subQuery()
              .select('1')
              .from(Organization, 'org')
              .where('org.orgId = :orgId')
              .andWhere('org.ownerId = :userId')
              .getQuery()
            return `EXISTS (${subQuery})`
          })
      })
      .setParameters({
        orgId,
        userId,
        roles: [
          userRoleEnum.LEADER,
          userRoleEnum.EDITOR,
          userRoleEnum.REVIEWER,
          userRoleEnum.EXECUTOR,
          userRoleEnum.CONTRIBUTOR,
          userRoleEnum.WATCHER
        ],
        orgRoles: [
          userRoleEnum.LEADER,
          userRoleEnum.EDITOR,
          userRoleEnum.REVIEWER,
          userRoleEnum.EXECUTOR,
          userRoleEnum.CONTRIBUTOR
        ]
      })
      .orderBy('dept.deptId', paginator.direction as 'ASC' | 'DESC')
      .skip(paginator.offset)
      .take(paginator.limit)
      .getMany()

    return departments.map((dept) => ({
      deptId: dept.deptId,
      name: dept.name,
      orgId: dept.orgId,
      ownerId: dept.ownerId
    }))
  }
}
