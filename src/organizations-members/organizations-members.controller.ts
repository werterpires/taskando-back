import {
  Controller,
  Put,
  Get,
  Body,
  Param,
  Query,
  Req,
  ParseIntPipe
} from '@nestjs/common'
import { OrganizationsMembersService } from './organizations-members.service'
import { CreateInviteDto } from './dto/create-invite.dto'
import { UpdateMemberDto } from './dto/update-member.dto'
import { CurrentUser } from 'src/users/decorators/current-user.decorator'
import { Paginator } from 'src/shared/types/paginator.types'
import { ValidateUser } from 'src/shared/auth/types'

@Controller('organizations-members')
export class OrganizationsMembersController {
  constructor(
    private readonly organizationsMembersService: OrganizationsMembersService
  ) {}

  @Put('invite')
  async createInvite(
    @Body() createInviteDto: CreateInviteDto,
    @CurrentUser() user: ValidateUser
  ) {
    console.log('user controller', user)
    const userId = user.userId

    return this.organizationsMembersService.createInvite(
      createInviteDto,
      userId
    )
  }

  @Get('organization/:orgId')
  async getAllMembers(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Query('limit', ParseIntPipe) limit: number = 10,
    @Query('offset', ParseIntPipe) offset: number = 0,
    @Query('orderBy') orderBy: string = 'userId',
    @Query('direction') direction: string = 'ASC',
    @CurrentUser() CurrentUser: ValidateUser
  ) {
    console.log('user controller', CurrentUser)
    const userId = CurrentUser.userId
    const paginator: Paginator = {
      limit,
      offset,
      orderBy,
      direction
    }

    return this.organizationsMembersService.getAllMembers(
      orgId,
      paginator,
      userId
    )
  }

  @Get('member')
  async getMemberById(
    @Query('userId', ParseIntPipe) userId: number,
    @Query('orgId', ParseIntPipe) orgId: number,
    @Req() req: any
  ) {
    const currentUserId = req.user?.id

    return this.organizationsMembersService.getMemberById(
      userId,
      orgId,
      currentUserId
    )
  }

  @Put('update')
  async updateMember(
    @Body() updateMemberDto: UpdateMemberDto,
    @Req() req: any
  ) {
    const currentUserId = req.user?.id

    return this.organizationsMembersService.updateMember(
      updateMemberDto,
      currentUserId
    )
  }
}
