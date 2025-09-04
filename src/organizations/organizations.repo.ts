import { Injectable } from '@nestjs/common'
import { InjectConnection } from 'nest-knexjs'
import { Knex } from 'knex'
import { CreateOrganizationData, Organization } from './types'
import { organizations } from '../constants/db'
import { Paginator } from '../shared/types/paginator.types'

@Injectable()
export class OrganizationsRepo {
  private columns = organizations.columns
  constructor(@InjectConnection('knexx') private readonly knex: Knex) {}

  async createOrganization(createOrganizationData: CreateOrganizationData) {
    return await this.knex(organizations.name).insert(createOrganizationData)
  }

  async getAllByOwnerId(
    ownerId: number,
    paginator: Paginator
  ): Promise<Organization[]> {
    return (await this.knex(organizations.name)
      .select([
        this.columns.id.name,
        this.columns.name.name,
        this.columns.cnpj.name,
        this.columns.address.name,
        this.columns.phone.name,
        this.columns.owner.name
      ])
      .where(this.columns.owner.name, ownerId)
      .orderBy(paginator.orderBy, paginator.direction)
      .limit(paginator.limit)
      .offset(paginator.offset)) as Organization[]
  }

  async countByOwnerId(ownerId: number): Promise<number> {
    const result = await this.knex(organizations.name)
      .count('* as total')
      .where(this.columns.owner.name, ownerId)
      .first()
    if (!result) return 0
    return parseInt(result.total as string, 10)
  }
}
