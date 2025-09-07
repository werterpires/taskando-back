import { Controller, Put, Body, UseGuards } from '@nestjs/common'
import { OrganizationsMembersService } from './organizations-members.service'
import { CreateInviteDto } from './dto/create-invite.dto'
import { JwtAuthGuard } from 'src/shared/auth/guards/jwt-auth.guard'
import { CurrentUser } from 'src/users/decorators/current-user.decorator'
import { User } from 'src/users/types'

@Controller('organizations-members')
@UseGuards(JwtAuthGuard)
export class OrganizationsMembersController {
  constructor(private readonly organizationsMembersService: OrganizationsMembersService) {}

  @Put('invite')
  async createInvite(@Body() createInviteDto: CreateInviteDto, @CurrentUser() user: User) {
    return this.organizationsMembersService.createInvite(createInviteDto, user.userId)
  }
}