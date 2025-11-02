import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import {
  CreateOrganizationData,
  Organization as OrganizationType
} from './types'
import { Organization } from './entities/organization.entity'
import { OrganizationMember } from '../organizations-members/entities/organization-member.entity'
import { Paginator } from '../shared/types/paginator.types'

@Injectable()
export class OrganizationsRepo {
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
    const queryBuilder = this.organizationRepository
      .createQueryBuilder('org')
      .select([
        'org.orgId',
        'org.name',
        'org.cnpj',
        'org.address',
        'org.phone',
        'org.ownerId'
      ])
      .where('org.ownerId = :userId', { userId })
      .orWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('1')
          .from(OrganizationMember, 'om')
          .where('om.orgId = org.orgId')
          .andWhere('om.userId = :userId', { userId })
          .getQuery()
        return `EXISTS (${subQuery})`
      })
      .orderBy(
        `org.${paginator.orderBy}`,
        paginator.direction as 'ASC' | 'DESC'
      )
      .skip(paginator.offset)
      .take(paginator.limit)

    const organizationsDB = await queryBuilder.getMany()

    // Buscar roles para cada organização
    const result: OrganizationType[] = []
    for (const org of organizationsDB) {
      const memberRoles = await this.organizationMemberRepository.find({
        where: { orgId: org.orgId, userId },
        select: ['role']
      })

      const currentUserRoles = memberRoles.map((member) => member.role)

      result.push({
        orgId: org.orgId,
        name: org.name,
        cnpj: org.cnpj,
        address: org.address,
        phone: org.phone,
        ownerId: org.ownerId,
        currentUserRoles: currentUserRoles as any
      })
    }

    return result
  }

  async countByOwnerIdOrMember(userId: number): Promise<number> {
    const count = await this.organizationRepository
      .createQueryBuilder('org')
      .where('org.ownerId = :userId', { userId })
      .orWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('1')
          .from(OrganizationMember, 'om')
          .where('om.orgId = org.orgId')
          .andWhere('om.userId = :userId', { userId })
          .getQuery()
        return `EXISTS (${subQuery})`
      })
      .getCount()

    return count
  }

  async getById(
    orgId: number,
    userId: number
  ): Promise<OrganizationType | null> {
    const organization = await this.organizationRepository
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.owner', 'owner')
      .where('org.orgId = :orgId', { orgId })
      .andWhere((qb) => {
        return (
          '(org.ownerId = :userId OR EXISTS (' +
          qb
            .subQuery()
            .select('1')
            .from(OrganizationMember, 'om')
            .where('om.orgId = :orgId')
            .andWhere('om.userId = :userId')
            .getQuery() +
          '))'
        )
      })
      .setParameters({ userId, orgId })
      .getOne()

    if (!organization) return null

    // Buscar roles do usuário atual nesta organização
    const memberRoles = await this.organizationMemberRepository.find({
      where: { orgId, userId },
      select: ['role']
    })

    const currentUserRoles = memberRoles.map((member) => member.role)

    return {
      orgId: organization.orgId,
      name: organization.name,
      cnpj: organization.cnpj,
      address: organization.address,
      phone: organization.phone,
      ownerId: organization.ownerId,
      currentUserRoles: currentUserRoles as any,
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
