
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

  async updateOrganization(organization: Organization) {
    return await this.knex(organizations.name)
      .where(this.columns.id.completeName, organization.orgId)
      .update({ ...organization, updated_at: new Date() })
  }

  async removeOrganization(orgId: number) {
    return await this.knex(organizations.name)
      .where(this.columns.id.completeName, orgId)
      .delete()
  }
}
