import { Injectable } from '@nestjs/common'
import { InjectConnection } from 'nest-knexjs'
import { Knex } from 'knex'
import { users, organizations, organizationMembers } from '../constants/db'
import { CreateUserData } from 'src/users/types'
import { OrganizationMember } from './types'

@Injectable()
export class OrganizationsMembersRepo {
  private usersColumns = users.columns
  private organizationsColumns = organizations.columns
  private organizationMembersColumns = organizationMembers.columns

  constructor(@InjectConnection('knexx') private readonly knex: Knex) {}

  async isUserOwnerOfOrganization(
    userId: number,
    orgId: number
  ): Promise<boolean> {
    const result = await this.knex(organizations.name)
      .select(this.organizationsColumns.id.name)
      .where(this.organizationsColumns.id.name, orgId)
      .andWhere(this.organizationsColumns.owner.name, userId)
      .first()

    return !!result
  }

  async isUserLeaderOfOrganization(
    userId: number,
    orgId: number
  ): Promise<boolean> {
    const result = await this.knex(organizationMembers.name)
      .select(this.organizationMembersColumns.userId.name)
      .where(this.organizationMembersColumns.userId.name, userId)
      .andWhere(this.organizationMembersColumns.orgId.name, orgId)
      .andWhere(this.organizationMembersColumns.role.name, 'leader')
      .first()

    return !!result
  }

  async createUserWithInviteAndAddToOrganization(
    userData: CreateUserData & { inviteCode: string },
    memberData: { orgId: number; role: string }
  ): Promise<number> {
    return await this.knex.transaction(async (trx) => {
      // Criar usuário
      const [userId] = await trx(users.name).insert(userData)

      // Adicionar usuário como membro da organização
      await trx(organizationMembers.name).insert({
        [this.organizationMembersColumns.userId.name]: userId,
        [this.organizationMembersColumns.orgId.name]: memberData.orgId,
        [this.organizationMembersColumns.role.name]: memberData.role,
        [this.organizationMembersColumns.active.name]: false
      })

      return userId
    })
  }

  async isUserMemberOfOrganization(
    userId: number,
    orgId: number
  ): Promise<boolean> {
    const result = await this.knex(organizationMembers.name)
      .select(this.organizationMembersColumns.userId.name)
      .where(this.organizationMembersColumns.userId.name, userId)
      .andWhere(this.organizationMembersColumns.orgId.name, orgId)
      .first()

    return !!result
  }

  async isUserActiveMemberOfOrganization(
    userId: number,
    orgId: number
  ): Promise<boolean> {
    const result = await this.knex(organizationMembers.name)
      .select(this.organizationMembersColumns.userId.name)
      .where(this.organizationMembersColumns.userId.name, userId)
      .andWhere(this.organizationMembersColumns.orgId.name, orgId)
      .andWhere(this.organizationMembersColumns.active.name, true)
      .first()

    return !!result
  }

  async getAllMembersByOrganization(
    orgId: number,
    limit: number,
    offset: number
  ): Promise<OrganizationMember[]> {
    const member = await this.knex(organizationMembers.name)
      .select([
        this.organizationMembersColumns.userId.name,
        this.organizationMembersColumns.orgId.name,
        this.organizationMembersColumns.role.name,
        this.organizationMembersColumns.active.name,
        this.usersColumns.id.name,
        this.usersColumns.email.name,
        this.usersColumns.firstName.name,
        this.usersColumns.lastName.name
      ])
      .leftJoin(
        users.name,
        this.organizationMembersColumns.userId.name,
        this.usersColumns.id.name
      )
      .where(this.organizationMembersColumns.orgId.name, orgId)
      .limit(limit)
      .offset(offset)

    return member
  }

  async countMembersByOrganization(orgId: number): Promise<number> {
    const result = await this.knex(organizationMembers.name)
      .count('* as total')
      .where(this.organizationMembersColumns.orgId.name, orgId)
      .first()

    if (!result) return 0
    return parseInt(result.total as string, 10)
  }

  async getMemberById(userId: number, orgId: number) {
    return await this.knex(organizationMembers.name)
      .select([
        this.organizationMembersColumns.userId.name,
        this.organizationMembersColumns.orgId.name,
        this.organizationMembersColumns.role.name,
        this.organizationMembersColumns.active.name,
        this.usersColumns.id.name,
        this.usersColumns.email.name,
        this.usersColumns.firstName.name,
        this.usersColumns.lastName.name,
        this.organizationsColumns.id.name,
        this.organizationsColumns.name.name,
        this.organizationsColumns.cnpj.name,
        this.organizationsColumns.address.name,
        this.organizationsColumns.phone.name,
        this.organizationsColumns.owner.name
      ])
      .leftJoin(
        users.name,
        this.organizationMembersColumns.userId.name,
        this.usersColumns.id.name
      )
      .leftJoin(
        organizations.name,
        this.organizationMembersColumns.orgId.name,
        this.organizationsColumns.id.name
      )
      .where(this.organizationMembersColumns.userId.name, userId)
      .andWhere(this.organizationMembersColumns.orgId.name, orgId)
      .first()
  }

  async updateMember(
    userId: number,
    orgId: number,
    updateData: { role?: string; active?: boolean }
  ) {
    return await this.knex(organizationMembers.name)
      .where(this.organizationMembersColumns.userId.name, userId)
      .andWhere(this.organizationMembersColumns.orgId.name, orgId)
      .update(updateData)
  }
}
