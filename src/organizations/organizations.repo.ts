
import { Injectable } from '@nestjs/common'
import { InjectConnection } from 'nest-knexjs'
import { Knex } from 'knex'
import { CreateOrganizationData, Organization } from './types'
import { organizations } from '../constants/db'

@Injectable()
export class OrganizationsRepo {
  private columns = organizations.columns
  constructor(@InjectConnection('knexx') private readonly knex: Knex) {}

  async createOrganization(createOrganizationData: CreateOrganizationData) {
    return await this.knex(organizations.name).insert(createOrganizationData)
  }

  async getAllByOwnerId(ownerId: number) {
    return await this.knex(organizations.name)
      .select([
        this.columns.id.name,
        this.columns.name.name,
        this.columns.cnpj.name,
        this.columns.address.name,
        this.columns.phone.name,
        this.columns.owner.name
      ])
      .where(this.columns.owner.name, ownerId)
  }
}
