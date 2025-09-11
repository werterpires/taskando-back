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
    console.log('userId, orgId', userId, orgId)
    const result = await this.knex(organizations.name)
      .select(this.organizationsColumns.id.completeName)
      .where(this.organizationsColumns.id.completeName, orgId)
      .andWhere(this.organizationsColumns.owner.completeName, userId)
      .first()

    return !!result
  }

  async isUserLeaderOfOrganization(
    userId: number,
    orgId: number
  ): Promise<boolean> {
    const result = await this.knex(organizationMembers.name)
      .select(this.organizationMembersColumns.userId.completeName)
      .where(this.organizationMembersColumns.userId.completeName, userId)
      .andWhere(this.organizationMembersColumns.orgId.completeName, orgId)
      .andWhere(this.organizationMembersColumns.role.completeName, 'leader')
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
        [this.organizationMembersColumns.userId.completeName]: userId,
        [this.organizationMembersColumns.orgId.completeName]: memberData.orgId,
        [this.organizationMembersColumns.role.completeName]: memberData.role,
        [this.organizationMembersColumns.active.completeName]: false
      })

      return userId
    })
  }

  async isUserMemberOfOrganization(
    userId: number,
    orgId: number
  ): Promise<boolean> {
    const result = await this.knex(organizationMembers.name)
      .select(this.organizationMembersColumns.userId.completeName)
      .where(this.organizationMembersColumns.userId.completeName, userId)
      .andWhere(this.organizationMembersColumns.orgId.completeName, orgId)
      .first()

    return !!result
  }

  async isUserActiveMemberOfOrganization(
    userId: number,
    orgId: number
  ): Promise<boolean> {
    const result = await this.knex(organizationMembers.name)
      .select(this.organizationMembersColumns.userId.completeName)
      .where(this.organizationMembersColumns.userId.completeName, userId)
      .andWhere(this.organizationMembersColumns.orgId.completeName, orgId)
      .andWhere(this.organizationMembersColumns.active.completeName, true)
      .first()

    return !!result
  }

  async getAllMembersByOrganization(
    orgId: number,
    limit: number,
    offset: number
  ): Promise<OrganizationMember[]> {
    const members: OrganizationMember[] = await this.knex(
      organizationMembers.name
    )
      .select([
        this.organizationMembersColumns.userId.completeName,
        this.organizationMembersColumns.orgId.completeName,
        this.organizationMembersColumns.role.completeName,
        this.organizationMembersColumns.active.completeName,
        this.usersColumns.id.completeName,
        this.usersColumns.email.completeName,
        this.usersColumns.firstName.completeName,
        this.usersColumns.lastName.completeName
      ])
      .leftJoin(
        users.name,
        this.organizationMembersColumns.userId.completeName,
        this.usersColumns.id.completeName
      )
      .where(this.organizationMembersColumns.orgId.completeName, orgId)
      .limit(limit)
      .offset(offset)

    const owner = await this.knex(organizations.name)
      .select(
        this.organizationsColumns.owner.completeName,
        this.organizationsColumns.id.completeName,
        this.usersColumns.firstName.completeName,
        this.usersColumns.lastName.completeName,
        this.usersColumns.email.completeName,
        this.usersColumns.id.completeName
      )
      .leftJoin(
        users.name,
        this.organizationsColumns.owner.completeName,
        this.usersColumns.id.completeName
      )
      .where(this.organizationsColumns.id.completeName, orgId)
      .first()

    owner.role = 'owner'
    owner.active = true

    members.push(owner as OrganizationMember)

    return members
  }

  async countMembersByOrganization(orgId: number): Promise<number> {
    const result = await this.knex(organizationMembers.name)
      .count('* as total')
      .where(this.organizationMembersColumns.orgId.completeName, orgId)
      .first()

    if (!result) return 0
    return parseInt(result.total as string, 10)
  }

  async getMemberById(userId: number, orgId: number) {
    return await this.knex(organizationMembers.name)
      .select([
        this.organizationMembersColumns.userId.completeName,
        this.organizationMembersColumns.orgId.completeName,
        this.organizationMembersColumns.role.completeName,
        this.organizationMembersColumns.active.completeName,
        this.usersColumns.id.completeName,
        this.usersColumns.email.completeName,
        this.usersColumns.firstName.completeName,
        this.usersColumns.lastName.completeName,
        this.organizationsColumns.id.completeName,
        this.organizationsColumns.completeName.completeName,
        this.organizationsColumns.cnpj.completeName,
        this.organizationsColumns.address.completeName,
        this.organizationsColumns.phone.completeName,
        this.organizationsColumns.owner.completeName
      ])
      .leftJoin(
        users.name,
        this.organizationMembersColumns.userId.completeName,
        this.usersColumns.id.completeName
      )
      .leftJoin(
        organizations.name,
        this.organizationMembersColumns.orgId.completeName,
        this.organizationsColumns.id.completeName
      )
      .where(this.organizationMembersColumns.userId.completeName, userId)
      .andWhere(this.organizationMembersColumns.orgId.completeName, orgId)
      .first()
  }

  async updateMember(
    userId: number,
    orgId: number,
    updateData: { role?: string; active?: boolean }
  ) {
    return await this.knex(organizationMembers.name)
      .where(this.organizationMembersColumns.userId.completeName, userId)
      .andWhere(this.organizationMembersColumns.orgId.completeName, orgId)
      .update(updateData)
  }
}
