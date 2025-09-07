import { Injectable } from '@nestjs/common'
import { InjectConnection } from 'nest-knexjs'
import { Knex } from 'knex'
import { CreateOrganizationData, Organization } from './types'
import { organizations, users, organizationMembers } from '../constants/db'
import { Paginator } from '../shared/types/paginator.types'

@Injectable()
export class OrganizationsRepo {
  private columns = organizations.columns
  private usersColumns = users.columns
  private organizationMembersColumns = organizationMembers.columns
  constructor(@InjectConnection('knexx') private readonly knex: Knex) {}

  async createOrganization(createOrganizationData: CreateOrganizationData) {
    return await this.knex(organizations.name).insert(createOrganizationData)
  }

  async getAllByOwnerIdOrMember(
    userId: number,
    paginator: Paginator
  ): Promise<Organization[]> {
    const organizationsDB = await this.knex(organizations.name)
      .select([
        this.columns.id.name,
        this.columns.name.name,
        this.columns.cnpj.name,
        this.columns.address.name,
        this.columns.phone.name,
        this.columns.owner.name
      ])
      .where(function () {
        this.where(organizations.columns.owner.name, userId).orWhereExists(
          function () {
            this.select('*')
              .from(organizationMembers.name)
              .innerJoin(
                { om: organizationMembers.name },
                organizationMembers.columns.orgId.completeName,
                organizations.columns.id.completeName
              )
              .andWhere(organizationMembers.columns.userId.completeName, userId)
          }
        )
      })
      .orderBy(paginator.orderBy, paginator.direction)
      .limit(paginator.limit)
      .offset(paginator.offset)

    // Buscar roles para cada organização
    for (const org of organizationsDB) {
      const memberRoles = await this.knex(organizationMembers.name)
        .select([this.organizationMembersColumns.role.name])
        .where(
          this.organizationMembersColumns.orgId.name,
          org[this.columns.id.name]
        )
        .andWhere(this.organizationMembersColumns.userId.name, userId)

      org.currentUserRoles = memberRoles.map(
        (member) => member[this.organizationMembersColumns.role.name]
      )
    }

    return organizationsDB as Organization[]
  }

  async countByOwnerIdOrMember(userId: number): Promise<number> {
    const result = await this.knex(organizations.name)
      .count('* as total')
      .where(function () {
        this.where(organizations.columns.owner.name, userId).orWhereExists(
          function () {
            this.select('*')
              .from(organizationMembers.name)
              .innerJoin(
                { om: organizationMembers.name },
                organizationMembers.columns.orgId.completeName,
                organizations.columns.id.completeName
              )
              .andWhere(organizationMembers.columns.userId.completeName, userId)
          }
        )
      })
      .first()
    if (!result) return 0
    return parseInt(result.total as string, 10)
  }

  async getById(orgId: number, userId: number): Promise<Organization | null> {
    const result = await this.knex(organizations.name)
      .select([
        this.columns.id.completeName,
        this.columns.name.completeName,
        this.columns.cnpj.completeName,
        this.columns.address.completeName,
        this.columns.phone.completeName,
        this.columns.owner.completeName,
        `${this.usersColumns.id.completeName} as ${this.usersColumns.id.name}`,
        `${this.usersColumns.email.completeName} as ${this.usersColumns.email.name}`,
        `${this.usersColumns.firstName.completeName} as ${this.usersColumns.firstName.name}`,
        `${this.usersColumns.lastName.completeName} as ${this.usersColumns.lastName.name}`
      ])
      .leftJoin(
        users.name,
        this.columns.owner.completeName,
        this.usersColumns.id.completeName
      )
      .where(this.columns.id.completeName, orgId)
      .where(function () {
        this.where(organizations.columns.owner.name, userId).orWhereExists(
          function () {
            this.select('*')
              .from(organizationMembers.name)
              .where(organizationMembers.columns.orgId.name, orgId)
              .andWhere(organizationMembers.columns.userId.name, userId)
          }
        )
      })
      .first()

    if (!result) return null

    // Buscar roles do usuário atual nesta organização
    const memberRoles = await this.knex(organizationMembers.name)
      .select([this.organizationMembersColumns.role.name])
      .where(this.organizationMembersColumns.orgId.name, orgId)
      .andWhere(this.organizationMembersColumns.userId.name, userId)

    const currentUserRoles = memberRoles.map(
      (member) => member[this.organizationMembersColumns.role.name]
    )

    return {
      orgId: result[this.columns.id.name],
      name: result[this.columns.name.name],
      cnpj: result[this.columns.cnpj.name],
      address: result[this.columns.address.name],
      phone: result[this.columns.phone.name],
      ownerId: result[this.columns.owner.name],
      currentUserRoles,
      owner: {
        userId: result[this.usersColumns.id.name],
        email: result[this.usersColumns.email.name],
        firstName: result[this.usersColumns.firstName.name],
        lastName: result[this.usersColumns.lastName.name]
      }
    } as Organization
  }

  async updateOrganization(
    orgId: number,
    updateData: Partial<CreateOrganizationData>,
    ownerId: number
  ) {
    return await this.knex(organizations.name)
      .where(this.columns.id.name, orgId)
      .andWhere(this.columns.owner.name, ownerId)
      .update(updateData)
  }

  async deleteOrganization(orgId: number, ownerId: number) {
    return await this.knex(organizations.name)
      .where(this.columns.id.name, orgId)
      .andWhere(this.columns.owner.name, ownerId)
      .del()
  }
}
