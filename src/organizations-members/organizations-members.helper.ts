
import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common'
import { CreateInviteDto } from './dto/create-invite.dto'
import { CreateUserData } from 'src/users/types'
import { OrganizationsMembersRepo } from './organizations-members.repo'
import { CustomErrors } from 'src/shared/custom-error-handler/erros.enum'

@Injectable()
export class OrganizationsMembersHelper {
  constructor(private readonly organizationsMembersRepo: OrganizationsMembersRepo) {}

  generateInviteCode(): string {
    // Gerar 22 caracteres aleatórios
    const randomChars = this.generateRandomString(22)
    
    // Gerar timestamp em base64 (8 caracteres)
    const timestamp = new Date().getTime().toString()
    const timestampBase64 = Buffer.from(timestamp).toString('base64').slice(0, 8)
    
    // Combinar para formar 30 caracteres
    return randomChars + timestampBase64
  }

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  extractTimestampFromInviteCode(inviteCode: string): Date {
    // Pegar os últimos 8 caracteres (timestamp em base64)
    const timestampBase64 = inviteCode.slice(-8)
    const timestamp = Buffer.from(timestampBase64, 'base64').toString()
    return new Date(parseInt(timestamp))
  }

  async validateUserCanCreateInvite(userId: number, orgId: number): Promise<void> {
    const isOwner = await this.organizationsMembersRepo.isUserOwnerOfOrganization(userId, orgId)
    const isLeader = await this.organizationsMembersRepo.isUserLeaderOfOrganization(userId, orgId)
    
    if (!isOwner && !isLeader) {
      throw new ForbiddenException(CustomErrors.INSUFFICIENT_PERMISSIONS)
    }
  }

  transformCreateInviteDtoToUserData(createInviteDto: CreateInviteDto, inviteCode: string): CreateUserData & { inviteCode: string } {
    if (!createInviteDto.email || !createInviteDto.firstName || !createInviteDto.lastName || !createInviteDto.password) {
      throw new BadRequestException('#Dados obrigatórios do usuário não fornecidos')
    }

    if (!createInviteDto.orgId || !createInviteDto.role) {
      throw new BadRequestException('#ID da organização e papel são obrigatórios')
    }

    return {
      email: createInviteDto.email,
      firstName: createInviteDto.firstName,
      lastName: createInviteDto.lastName,
      password: createInviteDto.password,
      inviteCode
    }
  }

  async validateUserCanAccessOrganization(userId: number, orgId: number): Promise<void> {
    const isOwner = await this.organizationsMembersRepo.isUserOwnerOfOrganization(userId, orgId)
    const isActiveMember = await this.organizationsMembersRepo.isUserActiveMemberOfOrganization(userId, orgId)
    
    if (!isOwner && !isActiveMember) {
      throw new ForbiddenException(CustomErrors.INSUFFICIENT_PERMISSIONS)
    }
  }

  async validateUserIsActiveMemberOrOwner(userId: number, orgId: number): Promise<void> {
    const isOwner = await this.organizationsMembersRepo.isUserOwnerOfOrganization(userId, orgId)
    const isActiveMember = await this.organizationsMembersRepo.isUserActiveMemberOfOrganization(userId, orgId)
    
    if (!isOwner && !isActiveMember) {
      throw new ForbiddenException(CustomErrors.INSUFFICIENT_PERMISSIONS)
    }
  }

  async validateUserCanUpdateMembers(userId: number, orgId: number): Promise<void> {
    const isOwner = await this.organizationsMembersRepo.isUserOwnerOfOrganization(userId, orgId)
    const isLeader = await this.organizationsMembersRepo.isUserLeaderOfOrganization(userId, orgId)
    
    if (!isOwner && !isLeader) {
      throw new ForbiddenException(CustomErrors.INSUFFICIENT_PERMISSIONS)
    }
  }

  transformDbResultToOrganizationMember(dbResult: any, includeOrganization: boolean = false) {
    const member = {
      userId: dbResult.userId,
      orgId: dbResult.orgId,
      role: dbResult.role,
      active: dbResult.active,
      user: dbResult.id ? {
        userId: dbResult.id,
        email: dbResult.email,
        firstName: dbResult.firstName,
        lastName: dbResult.lastName
      } : undefined
    }

    if (includeOrganization && dbResult.id) {
      member['organization'] = {
        orgId: dbResult.id,
        name: dbResult.name,
        cnpj: dbResult.cnpj,
        address: dbResult.address,
        phone: dbResult.phone,
        ownerId: dbResult.owner
      }
    }

    return member
  }
}
