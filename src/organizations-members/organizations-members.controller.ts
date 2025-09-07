import { Controller, Put, Body, Req, UseGuards, BadRequestException } from '@nestjs/common'
import { OrganizationsMembersService } from './organizations-members.service'
import { CreateInviteDto } from './dto/create-invite.dto'
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard'
import { CurrentUser } from 'src/users/decorators/current-user.decorator'
import { User } from 'src/users/types'

@Controller('organizations-members')
@UseGuards(JwtAuthGuard)
export class OrganizationsMembersController {
  constructor(private readonly organizationsMembersService: OrganizationsMembersService) {}

  @Put('invite')
  async createInvite(@Body() createInviteDto: CreateInviteDto, @Req() req: any) {
    const userId = req.user?.id

    if (!userId) {
      throw new BadRequestException('#Usuário não autenticado')
    }

    return this.organizationsMembersService.createInvite(createInviteDto, userId)
  }
}