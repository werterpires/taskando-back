import { Injectable } from '@nestjs/common'
import { CreateInviteDto } from './dto/create-invite.dto'
import { UpdateMemberDto } from './dto/update-member.dto'
import { OrganizationsMembersRepo } from './organizations-members.repo'
import { OrganizationsMembersHelper } from './organizations-members.helper'
import { userRoleEnum } from 'src/constants/roles.enum'
import { Paginator } from 'src/shared/types/paginator.types'
import { Response } from 'src/shared/types/response.types'
import { OrganizationMember } from './types'

@Injectable()
export class OrganizationsMembersService {
  constructor(
    private readonly organizationsMembersRepo: OrganizationsMembersRepo,
    private readonly organizationsMembersHelper: OrganizationsMembersHelper
  ) {}

  async createInvite(createInviteDto: CreateInviteDto, userId: number) {
    // Validar se o usuário pode criar convites
    await this.organizationsMembersHelper.validateUserCanCreateInvite(
      userId,
      createInviteDto.orgId
    )

    // Gerar código de convite
    const inviteCode = this.organizationsMembersHelper.generateInviteCode()

    // Transformar DTO em dados do usuário
    const userData =
      this.organizationsMembersHelper.transformCreateInviteDtoToUserData(
        createInviteDto,
        inviteCode
      )

    // Preparar dados do membro
    const memberData = {
      orgId: createInviteDto.orgId,
      role: createInviteDto.role
    }

    // Criar usuário e adicionar à organização em uma única transação
    const newUserId =
      await this.organizationsMembersRepo.createUserWithInviteAndAddToOrganization(
        userData,
        memberData
      )

    return { inviteCode, userId: newUserId }
  }

  async getAllMembers(orgId: number, paginator: Paginator, userId: number) {
    console.log('user', userId)
    // Validar se o usuário pode acessar a organização
    await this.organizationsMembersHelper.validateUserCanAccessOrganization(
      userId,
      orgId
    )

    const { limit = 10, offset = 0 } = paginator

    // Buscar membros com paginação
    const membersDb =
      await this.organizationsMembersRepo.getAllMembersByOrganization(
        orgId,
        limit,
        offset
      )
    const total =
      await this.organizationsMembersRepo.countMembersByOrganization(orgId)

    // Transformar resultado

    const response: Response<OrganizationMember> = {
      itens: membersDb,
      quantity: total
    }

    return response
  }

  async getMemberById(userId: number, orgId: number, currentUserId: number) {
    // Validar se o usuário atual é membro ativo ou owner da organização
    await this.organizationsMembersHelper.validateUserIsActiveMemberOrOwner(
      currentUserId,
      orgId
    )

    // Buscar membro específico
    const memberDb = await this.organizationsMembersRepo.getMemberById(
      userId,
      orgId
    )

    if (!memberDb) {
      throw new Error('Membro não encontrado')
    }

    // Transformar resultado incluindo organização
    return this.organizationsMembersHelper.transformDbResultToOrganizationMember(
      memberDb,
      true
    )
  }

  async updateMember(updateMemberDto: UpdateMemberDto, currentUserId: number) {
    // Validar se o usuário pode atualizar membros
    await this.organizationsMembersHelper.validateUserCanUpdateMembers(
      currentUserId,
      updateMemberDto.orgId
    )

    const updateData = {
      role: updateMemberDto.role,
      active: updateMemberDto.active
    }

    // Atualizar membro
    const result = await this.organizationsMembersRepo.updateMember(
      updateMemberDto.userId,
      updateMemberDto.orgId,
      updateData
    )

    if (result === 0) {
      throw new Error('Membro não encontrado ou não foi possível atualizar')
    }

    return { message: 'Membro atualizado com sucesso' }
  }
}
