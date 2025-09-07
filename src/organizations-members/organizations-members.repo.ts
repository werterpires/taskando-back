import { Injectable } from '@nestjs/common'
import { InjectConnection } from 'nest-knexjs'
import { Knex } from 'knex'
import { users, organizations, organizationMembers } from '../constants/db'
import { CreateUserData } from 'src/users/types'

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
  ) {
    return await this.knex(organizationMembers.name)
      .select([
        `${this.organizationMembersColumns.userId.name}`,
        `${this.organizationMembersColumns.orgId.name}`,
        `${this.organizationMembersColumns.role.name}`,
        `${this.organizationMembersColumns.active.name}`,
        `${this.usersColumns.id.name} as user_id`,
        `${this.usersColumns.email.name} as user_email`,
        `${this.usersColumns.firstName.name} as user_firstName`,
        `${this.usersColumns.lastName.name} as user_lastName`
      ])
      .leftJoin(
        users.name,
        this.organizationMembersColumns.userId.name,
        this.usersColumns.id.name
      )
      .where(this.organizationMembersColumns.orgId.name, orgId)
      .limit(limit)
      .offset(offset)
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
        `${this.organizationMembersColumns.userId.name}`,
        `${this.organizationMembersColumns.orgId.name}`,
        `${this.organizationMembersColumns.role.name}`,
        `${this.organizationMembersColumns.active.name}`,
        `${this.usersColumns.id.name} as user_id`,
        `${this.usersColumns.email.name} as user_email`,
        `${this.usersColumns.firstName.name} as user_firstName`,
        `${this.usersColumns.lastName.name} as user_lastName`,
        `${this.organizationsColumns.id.name} as org_id`,
        `${this.organizationsColumns.name.name} as org_name`,
        `${this.organizationsColumns.cnpj.name} as org_cnpj`,
        `${this.organizationsColumns.address.name} as org_address`,
        `${this.organizationsColumns.phone.name} as org_phone`,
        `${this.organizationsColumns.owner.name} as org_owner`
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
