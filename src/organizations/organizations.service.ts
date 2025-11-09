import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { powers, userRoleEnum } from '../constants/roles.enum'
import { OrganizationMember } from '../organizations-members/entities/organization-member.entity'
import { ValidateUser } from '../shared/auth/types'
import { Response } from '../shared/types/response.types'
import { Paginator } from '../shared/types/paginator.types'
import { CreateOrganizationDto } from './dto/create-organization.dto'
import { UpdateOrganizationDto } from './dto/update-organization.dto'
import { Organization } from './entities/organization.entity'
import { IOrganization } from './types'

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepository: Repository<OrganizationMember>,
    private readonly dataSource: DataSource
  ) {}

  async getOne(
    orgId: number,
    currentUser: ValidateUser
  ): Promise<IOrganization> {
    // Check if user has view power for this organization
    const organization = await this.organizationRepository
      .createQueryBuilder('org')
      .innerJoin(
        'org.orgMembers',
        'member',
        'member.userId = :userId AND member.active = true',
        { userId: currentUser.userId }
      )
      .where('org.orgId = :orgId', { orgId })
      .andWhere('member.role LIKE :viewPower', {
        viewPower: `%${powers.view}%`
      })
      .select(['org', 'member.role'])
      .getOne()

    if (!organization) {
      throw new NotFoundException('Organization not found or access denied')
    }

    // Get current user member info
    const currentUserMember = await this.organizationMemberRepository.findOne({
      where: {
        orgId: organization.orgId,
        userId: currentUser.userId,
        active: true
      }
    })

    return {
      ...organization,
      currentUserRoles: currentUserMember?.role || ''
    } as IOrganization
  }

  async getAll(
    paginator: Paginator<Organization>,
    currentUser: ValidateUser
  ): Promise<Response<Organization, IOrganization>> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'orgName',
      direction = 'ASC',
      filters = []
    } = paginator

    // Build the query to get organizations where user is member with view power
    const queryBuilder = this.organizationRepository
      .createQueryBuilder('org')
      .innerJoin(
        'org.orgMembers',
        'member',
        'member.userId = :userId AND member.active = true',
        { userId: currentUser.userId }
      )
      .where('member.role LIKE :viewPower', { viewPower: `%${powers.view}%` })

    // Apply active filter
    filters.forEach((filter) => {
      const { filterType, field, value } = filter
      if (filterType && field && value !== undefined) {
        switch (filterType) {
          case 'like':
            queryBuilder.andWhere(`org.${field} LIKE :${field}`, {
              [field]: `%${value}%`
            })
            break
          case 'equal':
            queryBuilder.andWhere(`org.${field} = :${field}`, {
              [field]: value
            })
            break
          case 'moreThan':
            queryBuilder.andWhere(`org.${field} > :${field}`, {
              [field]: value
            })
            break
          case 'lessThan':
            queryBuilder.andWhere(`org.${field} < :${field}`, {
              [field]: value
            })
            break
        }
      }
    })

    // Get total count
    const totalItems = await queryBuilder.getCount()

    // Apply pagination and ordering - now select member role too
    const organizationsWithRoles = await queryBuilder
      .select(['org', 'member.role'])
      .orderBy(`org.${orderBy}`, direction)
      .skip(offset)
      .take(limit)
      .getMany()

    // Get owner information for each organization
    const organizationsWithOwner = await Promise.all(
      organizationsWithRoles.map(async (org) => {
        const currentUserMember =
          await this.organizationMemberRepository.findOne({
            where: {
              orgId: org.orgId,
              userId: currentUser.userId,
              active: true
            }
          })

        return {
          ...org,
          currentUserRoles: currentUserMember?.role || ''
        } as IOrganization
      })
    )

    // Build paginator
    const paginatory: Paginator<Organization> = {
      limit,
      offset,
      orderBy,
      direction,
      filters,
      totalItems
    }

    return {
      paginator: paginatory,
      itens: organizationsWithOwner
    }
  }

  async update(
    orgId: number,
    updateOrganizationDto: Omit<UpdateOrganizationDto, 'orgId'>,
    currentUser: ValidateUser
  ): Promise<Organization> {
    // Check if user has editAndDelete power for this organization
    const organizationMember = await this.organizationMemberRepository.findOne({
      where: {
        orgId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (
      !organizationMember ||
      !organizationMember.role.includes(powers.editAndDelete)
    ) {
      throw new NotFoundException(
        'Organization not found or insufficient permissions'
      )
    }

    // Use preload to load existing entity and apply changes in one go
    const organizationToUpdate = await this.organizationRepository.preload({
      orgId,
      ...updateOrganizationDto
    })

    if (!organizationToUpdate || !organizationToUpdate.orgActive) {
      throw new NotFoundException('Organization not found')
    }

    // Save the updated organization
    return await this.organizationRepository.save(organizationToUpdate)
  }

  async delete(orgId: number, currentUser: ValidateUser): Promise<void> {
    // Check if user has editAndDelete power for this organization
    const organizationMember = await this.organizationMemberRepository.findOne({
      where: {
        orgId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (
      !organizationMember ||
      !organizationMember.role.includes(powers.editAndDelete)
    ) {
      throw new NotFoundException(
        'Organization not found or insufficient permissions'
      )
    }

    // Check if organization exists and is active
    const organization = await this.organizationRepository.findOne({
      where: { orgId, orgActive: true }
    })

    if (!organization) {
      throw new NotFoundException('Organization not found')
    }

    // Soft delete by setting orgActive to false
    await this.organizationRepository.update(orgId, { orgActive: false })
  }

  async create(
    createOrganizationDto: CreateOrganizationDto,
    currentUser: ValidateUser
  ): Promise<Organization> {
    return await this.dataSource.transaction(async (manager) => {
      // Create the organization
      const organization = manager.create(Organization, {
        ...createOrganizationDto,
        orgActive: true
      })

      const savedOrganization = await manager.save(Organization, organization)

      // Create the organization member with OWNER role
      const organizationMember = manager.create(OrganizationMember, {
        userId: currentUser.userId,
        orgId: savedOrganization.orgId,
        role: userRoleEnum.OWNER,
        active: true
      })

      await manager.save(OrganizationMember, organizationMember)

      return savedOrganization
    })
  }
}
