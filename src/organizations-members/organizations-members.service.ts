import { Injectable } from '@nestjs/common'
import { CreateInviteDto } from './dto/create-invite.dto'
import { OrganizationsMembersRepo } from './organizations-members.repo'
import { OrganizationsMembersHelper } from './organizations-members.helper'
import { userRoleEnum } from 'src/constants/roles.enum'

@Injectable()
export class OrganizationsMembersService {
  constructor(
    private readonly organizationsMembersRepo: OrganizationsMembersRepo,
    private readonly organizationsMembersHelper: OrganizationsMembersHelper
  ) {}

  async createInvite(createInviteDto: CreateInviteDto, userId: number) {
    // Validar se o usuário pode criar convites
    await this.organizationsMembersHelper.validateUserCanCreateInvite(userId, createInviteDto.orgId)

    // Gerar código de convite
    const inviteCode = this.organizationsMembersHelper.generateInviteCode()

    // Transformar DTO em dados do usuário
    const userData = this.organizationsMembersHelper.transformCreateInviteDtoToUserData(createInviteDto, inviteCode)

    // Preparar dados do membro
    const memberData = { orgId: createInviteDto.orgId, role: createInviteDto.role }

    // Criar usuário e adicionar à organização em uma única transação
    const newUserId = await this.organizationsMembersRepo.createUserWithInviteAndAddToOrganization(userData, memberData)

    return { inviteCode, userId: newUserId }
  }
}