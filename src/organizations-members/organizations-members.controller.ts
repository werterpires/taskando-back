import { Controller } from '@nestjs/common'
import { OrganizationsMembersService } from './organizations-members.service'

@Controller('organizations-members')
export class OrganizationsMembersController {
  constructor(
    private readonly organizationsMembersService: OrganizationsMembersService
  ) {}
}
