
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

  async isUserOwnerOfOrganization(userId: number, orgId: number): Promise<boolean> {
    const result = await this.knex(organizations.name)
      .select(this.organizationsColumns.id.name)
      .where(this.organizationsColumns.id.name, orgId)
      .andWhere(this.organizationsColumns.owner.name, userId)
      .first()

    return !!result
  }

  async isUserLeaderOfOrganization(userId: number, orgId: number): Promise<boolean> {
    const result = await this.knex(organizationMembers.name)
      .select(this.organizationMembersColumns.userId.name)
      .where(this.organizationMembersColumns.userId.name, userId)
      .andWhere(this.organizationMembersColumns.orgId.name, orgId)
      .andWhere(this.organizationMembersColumns.role.name, 'leader')
      .first()

    return !!result
  }

  async createUserWithInvite(userData: CreateUserData & { inviteCode: string }): Promise<number> {
    const [userId] = await this.knex(users.name).insert(userData)
    return userId
  }

  async addMemberToOrganization(memberData: { userId: number; orgId: number; role: string }) {
    return await this.knex(organizationMembers.name).insert({
      [this.organizationMembersColumns.userId.name]: memberData.userId,
      [this.organizationMembersColumns.orgId.name]: memberData.orgId,
      [this.organizationMembersColumns.role.name]: memberData.role
    })
  }
}
