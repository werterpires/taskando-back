import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import {
  CreateOrganizationData,
  Organization as OrganizationType
} from './types'
import { Organization } from './entities/organization.entity'
import { OrganizationMember } from '../organizations-members/entities/organization-member.entity'
import { Paginator } from '../shared/types/paginator.types'
import { userRoleEnum } from 'src/constants/roles.enum'

@Injectable()
export class OrganizationsSimpleRepo {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepository: Repository<OrganizationMember>
  ) {}

  async createOrganization(createOrganizationData: CreateOrganizationData) {
    const organization = this.organizationRepository.create(
      createOrganizationData
    )
    return await this.organizationRepository.save(organization)
  }

  async getAllByOwnerIdOrMember(
    userId: number,
    paginator: Paginator
  ): Promise<OrganizationType[]> {
    // 1. Buscar IDs das organizações que o usuário tem acesso
    const memberOrgIds = await this.organizationMemberRepository
      .find({
        where: { userId, active: true },
        select: ['orgId']
      })
      .then((members) => members.map((m) => m.orgId))

    const ownedOrgIds = await this.organizationRepository
      .find({
        where: { ownerId: userId },
        select: ['orgId']
      })
      .then((orgs) => orgs.map((o) => o.orgId))

    const allOrgIds = [...new Set([...memberOrgIds, ...ownedOrgIds])]

    if (allOrgIds.length === 0) {
      return []
    }

    // 2. Buscar organizações com relações
    const organizations = await this.organizationRepository.find({
      where: { orgId: In(allOrgIds) },
      relations: {
        members: {
          user: true
        }
      },
      order: { [paginator.orderBy]: paginator.direction },
      skip: paginator.offset,
      take: paginator.limit
    })

    // 3. Filtrar apenas os membros do usuário atual
    return organizations.map((org) => ({
      orgId: org.orgId,
      name: org.name,
      cnpj: org.cnpj,
      address: org.address,
      phone: org.phone,
      ownerId: org.ownerId,
      currentUserRoles:
        org.members
          ?.filter((member) => member.userId === userId)
          .map((member) => member.role as userRoleEnum) || []
    }))
  }

  async countByOwnerIdOrMember(userId: number): Promise<number> {
    // Versão simplificada do count
    const memberOrgIds = await this.organizationMemberRepository
      .find({
        where: { userId, active: true },
        select: ['orgId']
      })
      .then((members) => members.map((m) => m.orgId))

    const ownedOrgIds = await this.organizationRepository
      .find({
        where: { ownerId: userId },
        select: ['orgId']
      })
      .then((orgs) => orgs.map((o) => o.orgId))

    const allOrgIds = [...new Set([...memberOrgIds, ...ownedOrgIds])]
    return allOrgIds.length
  }

  async getById(
    orgId: number,
    userId: number
  ): Promise<OrganizationType | null> {
    // Usando findOne com relações
    const organization = await this.organizationRepository.findOne({
      where: { orgId },
      relations: {
        owner: true,
        members: {
          user: true
        }
      }
    })

    if (!organization) return null

    // Verificar se o usuário tem acesso
    const hasAccess =
      organization.ownerId === userId ||
      organization.members?.some(
        (member) => member.userId === userId && member.active
      )

    if (!hasAccess) return null

    return {
      orgId: organization.orgId,
      name: organization.name,
      cnpj: organization.cnpj,
      address: organization.address,
      phone: organization.phone,
      ownerId: organization.ownerId,
      currentUserRoles:
        organization.members
          ?.filter((member) => member.userId === userId && member.active)
          .map((member) => member.role as any) || [],
      owner: organization.owner
        ? {
            userId: organization.owner.id,
            email: organization.owner.email,
            firstName: organization.owner.firstName,
            lastName: organization.owner.lastName
          }
        : undefined
    }
  }

  async updateOrganization(
    orgId: number,
    updateData: Partial<CreateOrganizationData>,
    ownerId: number
  ) {
    const result = await this.organizationRepository.update(
      { orgId, ownerId },
      updateData
    )
    return result.affected || 0
  }

  async deleteOrganization(orgId: number, ownerId: number) {
    const result = await this.organizationRepository.delete({ orgId, ownerId })
    return result.affected || 0
  }
}
