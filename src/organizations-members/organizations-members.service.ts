
import { Injectable } from '@nestjs/common'
import { CreateInviteDto } from './dto/create-invite.dto'
import { OrganizationsMembersRepo } from './organizations-members.repo'
import { OrganizationsMembersHelper } from './organizations-members.helper'

@Injectable()
export class OrganizationsMembersService {
  constructor(
    private readonly organizationsMembersRepo: OrganizationsMembersRepo,
    private readonly organizationsMembersHelper: OrganizationsMembersHelper
  ) {}

  async createInvite(createInviteDto: CreateInviteDto, userId: number) {
    // Verificar se o usuário é owner da organização
    const isOwner = await this.organizationsMembersRepo.isUserOwnerOfOrganization(
      userId, 
      createInviteDto.orgId
    )
    
    if (!isOwner) {
      throw new Error('Apenas o owner da organização pode criar convites')
    }

    // Gerar código de convite
    const inviteCode = this.organizationsMembersHelper.generateInviteCode()

    // Criar usuário com código de convite
    const newUserId = await this.organizationsMembersRepo.createUserWithInvite({
      email: createInviteDto.email,
      firstName: createInviteDto.firstName,
      lastName: createInviteDto.lastName,
      password: createInviteDto.password,
      inviteCode
    })

    // Adicionar membro à organização
    await this.organizationsMembersRepo.addMemberToOrganization({
      userId: newUserId,
      orgId: createInviteDto.orgId,
      role: createInviteDto.role
    })

    return { inviteCode, userId: newUserId }
  }
}
