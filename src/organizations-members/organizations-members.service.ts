import { Injectable } from '@nestjs/common'
import { OrganizationsMembersHelper } from './organizations-members.helper'

@Injectable()
export class OrganizationsMembersService {
  constructor(
    private readonly organizationsMembersHelper: OrganizationsMembersHelper
  ) {}
}
