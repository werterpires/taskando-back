import {
  Controller,
  Put,
  Get,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  BadRequestException,
  ParseIntPipe
} from '@nestjs/common'
import { OrganizationsMembersService } from './organizations-members.service'
import { CreateInviteDto } from './dto/create-invite.dto'
import { GetAllMembersDto } from './dto/get-all-members.dto'
import { GetMemberByIdDto } from './dto/get-member-by-id.dto'
import { UpdateMemberDto } from './dto/update-member.dto'
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard'
import { CurrentUser } from 'src/users/decorators/current-user.decorator'
import { User } from 'src/users/types'

@Controller('organizations-members')
@UseGuards(JwtAuthGuard)
export class OrganizationsMembersController {
  constructor(
    private readonly organizationsMembersService: OrganizationsMembersService
  ) {}

  @Put('invite')
  async createInvite(
    @Body() createInviteDto: CreateInviteDto,
    @Req() req: any
  ) {
    const userId = req.user?.id

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
    @Req() req: any
  ) {
    const userId = req.user?.id
    const getAllMembersDto: GetAllMembersDto = {
      orgId,
      limit,
      offset,
      orderBy,
      direction
    }

    return this.organizationsMembersService.getAllMembers(
      getAllMembersDto,
      userId
    )
  }

  @Get('user/:userId/organization/:orgId')
  async getMemberById(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('orgId', ParseIntPipe) orgId: number,
    @Req() req: any
  ) {
    const currentUserId = req.user?.id
    const getMemberByIdDto: GetMemberByIdDto = {
      userId,
      orgId
    }

    return this.organizationsMembersService.getMemberById(
      getMemberByIdDto,
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
