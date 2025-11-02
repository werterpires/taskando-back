import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { CreateUserData } from 'src/users/types'
import { OrganizationMember as OrganizationMemberType } from './types'
import { OrganizationMember } from './entities/organization-member.entity'
import { User } from '../users/entities/user.entity'
import { Organization } from '../organizations/entities/organization.entity'

@Injectable()
export class OrganizationsMembersRepo {
  constructor(
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepository: Repository<OrganizationMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly dataSource: DataSource
  ) {}

  async isUserOwnerOfOrganization(
    userId: number,
    orgId: number
  ): Promise<boolean> {
    console.log('userId, orgId', userId, orgId)
    const result = await this.organizationRepository.findOne({
      where: { orgId, ownerId: userId },
      select: ['orgId']
    })

    return !!result
  }

  async isUserLeaderOfOrganization(
    userId: number,
    orgId: number
  ): Promise<boolean> {
    const result = await this.organizationMemberRepository.findOne({
      where: { userId, orgId, role: 'leader' },
      select: ['userId']
    })

    return !!result
  }

  async createUserWithInviteAndAddToOrganization(
    userData: CreateUserData & { inviteCode: string },
    memberData: { orgId: number; role: string }
  ): Promise<number> {
    return await this.dataSource.transaction(async (entityManager) => {
      // Criar usuário
      const user = entityManager.create(User, userData)
      const savedUser = await entityManager.save(user)

      // Adicionar usuário como membro da organização
      const organizationMember = entityManager.create(OrganizationMember, {
        userId: savedUser.id,
        orgId: memberData.orgId,
        role: memberData.role,
        active: false
      })
      await entityManager.save(organizationMember)

      return savedUser.id
    })
  }

  async isUserMemberOfOrganization(
    userId: number,
    orgId: number
  ): Promise<boolean> {
    const result = await this.organizationMemberRepository.findOne({
      where: { userId, orgId },
      select: ['userId']
    })

    return !!result
  }

  async isUserActiveMemberOfOrganization(
    userId: number,
    orgId: number
  ): Promise<boolean> {
    const result = await this.organizationMemberRepository.findOne({
      where: { userId, orgId, active: true },
      select: ['userId']
    })

    return !!result
  }

  async getAllMembersByOrganization(
    orgId: number,
    limit: number,
    offset: number
  ): Promise<OrganizationMemberType[]> {
    // Buscar membros da organização
    const members = await this.organizationMemberRepository.find({
      where: { orgId },
      relations: ['user'],
      skip: offset,
      take: limit
    })

    // Buscar o owner da organização
    const organization = await this.organizationRepository.findOne({
      where: { orgId },
      relations: ['owner']
    })

    const result: OrganizationMemberType[] = []

    // Adicionar membros
    for (const member of members) {
      result.push({
        userId: member.user.id,
        orgId: member.orgId,
        role: member.role as any,
        email: member.user.email,
        firstName: member.user.firstName,
        lastName: member.user.lastName
      })
    }

    // Adicionar owner se encontrado
    if (organization?.owner) {
      result.push({
        userId: organization.owner.id,
        orgId: organization.orgId,
        role: 'owner' as any,
        email: organization.owner.email,
        firstName: organization.owner.firstName,
        lastName: organization.owner.lastName
      })
    }

    return result
  }

  async countMembersByOrganization(orgId: number): Promise<number> {
    const count = await this.organizationMemberRepository.count({
      where: { orgId }
    })

    // +1 para incluir o owner
    return count + 1
  }

  async getMemberById(userId: number, orgId: number) {
    const member = await this.organizationMemberRepository.findOne({
      where: { userId, orgId },
      relations: ['user', 'organization']
    })

    if (!member) return null

    return {
      userId: member.userId,
      orgId: member.orgId,
      role: member.role,
      active: member.active,
      id: member.user.id,
      email: member.user.email,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      organization: {
        orgId: member.organization.orgId,
        name: member.organization.name,
        cnpj: member.organization.cnpj,
        address: member.organization.address,
        phone: member.organization.phone,
        ownerId: member.organization.ownerId
      }
    }
  }

  async updateMember(
    userId: number,
    orgId: number,
    updateData: { role?: string; active?: boolean }
  ) {
    const result = await this.organizationMemberRepository.update(
      { userId, orgId },
      updateData
    )
    return result.affected || 0
  }
}
