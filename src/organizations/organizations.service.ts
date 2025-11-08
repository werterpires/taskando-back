import { Injectable } from '@nestjs/common'
import { OrganizationsHelper } from './organizations.helper'

@Injectable()
export class OrganizationsService {
  constructor(private readonly organizationsHelper: OrganizationsHelper) {}
}
