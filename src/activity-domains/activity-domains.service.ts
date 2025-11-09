import {
  Injectable,
  NotFoundException,
  BadRequestException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { powers } from '../constants/roles.enum'
import { OrganizationMember } from '../organizations-members/entities/organization-member.entity'
import { DepartmentMember } from '../departments/entities/department-member.entity'
import { TeamMember } from '../teams/entities/team-member.entity'
import { SquadMember } from '../squads/entities/squad-member.entity'
import { ValidateUser } from '../shared/auth/types'
import { Response } from '../shared/types/response.types'
import { Paginator } from '../shared/types/paginator.types'
import { CreateActivityDomainDto } from './dto/create-activity-domain.dto'
import { UpdateActivityDomainDto } from './dto/update-activity-domain.dto'
import { ActivityDomain } from './entities/activity-domain.entity'
import { IActivityDomain } from './types'
import { ActivityDomainsHelper } from './activity-domains.helper'

@Injectable()
export class ActivityDomainsService {
  constructor(
    @InjectRepository(ActivityDomain)
    private readonly activityDomainRepository: Repository<ActivityDomain>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepository: Repository<OrganizationMember>,
    @InjectRepository(DepartmentMember)
    private readonly departmentMemberRepository: Repository<DepartmentMember>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(SquadMember)
    private readonly squadMemberRepository: Repository<SquadMember>,
    private readonly dataSource: DataSource,
    private readonly activityDomainsHelper: ActivityDomainsHelper
  ) {}

  async getOne(
    areaId: number,
    currentUser: ValidateUser
  ): Promise<IActivityDomain> {
    // Find the activity domain
    const activityDomain = await this.activityDomainRepository.findOne({
      where: { areaId, active: true }
    })

    if (!activityDomain) {
      throw new NotFoundException('Activity domain not found')
    }

    // Check if user has view power in the parent entity
    let hasAccess = false
    let userRole = ''

    if (activityDomain.orgId) {
      const orgMember = await this.organizationMemberRepository.findOne({
        where: {
          orgId: activityDomain.orgId,
          userId: currentUser.userId,
          active: true
        }
      })
      if (orgMember && orgMember.role.includes(powers.view)) {
        hasAccess = true
        userRole = orgMember.role
      }
    } else if (activityDomain.deptId) {
      const deptMember = await this.departmentMemberRepository.findOne({
        where: {
          departmentId: activityDomain.deptId,
          userId: currentUser.userId,
          active: true
        }
      })
      if (deptMember && deptMember.role.includes(powers.view)) {
        hasAccess = true
        userRole = deptMember.role
      }
    } else if (activityDomain.teamId) {
      const teamMember = await this.teamMemberRepository.findOne({
        where: {
          teamId: activityDomain.teamId,
          userId: currentUser.userId,
          active: true
        }
      })
      if (teamMember && teamMember.role.includes(powers.view)) {
        hasAccess = true
        userRole = teamMember.role
      }
    } else if (activityDomain.squadId) {
      const squadMember = await this.squadMemberRepository.findOne({
        where: {
          squadId: activityDomain.squadId,
          userId: currentUser.userId,
          active: true
        }
      })
      if (squadMember && squadMember.role.includes(powers.view)) {
        hasAccess = true
        userRole = squadMember.role
      }
    }

    if (!hasAccess) {
      throw new NotFoundException('Activity domain not found or access denied')
    }

    return {
      areaId: activityDomain.areaId,
      name: activityDomain.name,
      percentual: activityDomain.percentual,
      deptId: activityDomain.deptId,
      orgId: activityDomain.orgId,
      teamId: activityDomain.teamId,
      squadId: activityDomain.squadId,
      currentUserRoles: userRole
    } as IActivityDomain
  }

  async getAll(
    paginator: Paginator<ActivityDomain>,
    currentUser: ValidateUser
  ): Promise<Response<ActivityDomain, IActivityDomain>> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'name',
      direction = 'ASC',
      filters = []
    } = paginator

    // Get all organizations, departments, teams, and squads where user is member
    const orgMembers = await this.organizationMemberRepository.find({
      where: { userId: currentUser.userId, active: true }
    })
    const deptMembers = await this.departmentMemberRepository.find({
      where: { userId: currentUser.userId, active: true }
    })
    const teamMembers = await this.teamMemberRepository.find({
      where: { userId: currentUser.userId, active: true }
    })
    const squadMembers = await this.squadMemberRepository.find({
      where: { userId: currentUser.userId, active: true }
    })

    const orgIds = orgMembers
      .filter((m) => m.role.includes(powers.view))
      .map((m) => m.orgId)
    const deptIds = deptMembers
      .filter((m) => m.role.includes(powers.view))
      .map((m) => m.departmentId)
    const teamIds = teamMembers
      .filter((m) => m.role.includes(powers.view))
      .map((m) => m.teamId)
    const squadIds = squadMembers
      .filter((m) => m.role.includes(powers.view))
      .map((m) => m.squadId)

    // Build the query
    const queryBuilder = this.activityDomainRepository
      .createQueryBuilder('domain')
      .where('domain.active = :active', { active: true })

    // Add WHERE conditions for accessible entities
    if (
      orgIds.length > 0 ||
      deptIds.length > 0 ||
      teamIds.length > 0 ||
      squadIds.length > 0
    ) {
      queryBuilder.andWhere(
        '(domain.orgId IN (:...orgIds) OR domain.deptId IN (:...deptIds) OR domain.teamId IN (:...teamIds) OR domain.squadId IN (:...squadIds))',
        { orgIds, deptIds, teamIds, squadIds }
      )
    } else {
      // User has no access to any entity
      return {
        paginator: { ...paginator, totalItems: 0 },
        itens: []
      }
    }

    // Apply filters
    filters.forEach((filter) => {
      const { filterType, field, value } = filter
      if (filterType && field && value !== undefined) {
        switch (filterType) {
          case 'like':
            queryBuilder.andWhere(`domain.${field} LIKE :${field}`, {
              [field]: `%${value}%`
            })
            break
          case 'equal':
            queryBuilder.andWhere(`domain.${field} = :${field}`, {
              [field]: value
            })
            break
          case 'moreThan':
            queryBuilder.andWhere(`domain.${field} > :${field}`, {
              [field]: value
            })
            break
          case 'lessThan':
            queryBuilder.andWhere(`domain.${field} < :${field}`, {
              [field]: value
            })
            break
        }
      }
    })

    // Get total count
    const totalItems = await queryBuilder.getCount()

    // Apply pagination and ordering
    const domains = await queryBuilder
      .orderBy(`domain.${orderBy}`, direction)
      .skip(offset)
      .take(limit)
      .getMany()

    // Map to response format with user roles
    const domainsWithUserRoles = domains.map((domain) => {
      let userRole = ''

      if (domain.orgId) {
        const orgMember = orgMembers.find((m) => m.orgId === domain.orgId)
        userRole = orgMember?.role || ''
      } else if (domain.deptId) {
        const deptMember = deptMembers.find(
          (m) => m.departmentId === domain.deptId
        )
        userRole = deptMember?.role || ''
      } else if (domain.teamId) {
        const teamMember = teamMembers.find((m) => m.teamId === domain.teamId)
        userRole = teamMember?.role || ''
      } else if (domain.squadId) {
        const squadMember = squadMembers.find(
          (m) => m.squadId === domain.squadId
        )
        userRole = squadMember?.role || ''
      }

      return {
        areaId: domain.areaId,
        name: domain.name,
        percentual: domain.percentual,
        deptId: domain.deptId,
        orgId: domain.orgId,
        teamId: domain.teamId,
        squadId: domain.squadId,
        currentUserRoles: userRole
      } as IActivityDomain
    })

    // Build paginator
    const paginatory: Paginator<ActivityDomain> = {
      limit,
      offset,
      orderBy,
      direction,
      filters,
      totalItems
    }

    return {
      paginator: paginatory,
      itens: domainsWithUserRoles
    }
  }

  async getAllByOrgId(
    orgId: number,
    paginator: Paginator<ActivityDomain>,
    currentUser: ValidateUser
  ): Promise<Response<ActivityDomain, IActivityDomain>> {
    // Check if user has seeChildren power in the organization
    const organizationMember = await this.organizationMemberRepository.findOne({
      where: {
        orgId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (
      !organizationMember ||
      !organizationMember.role.includes(powers.seeChildren)
    ) {
      throw new NotFoundException(
        'Organization not found or insufficient permissions to see activity domains'
      )
    }

    const {
      limit = 20,
      offset = 0,
      orderBy = 'name',
      direction = 'ASC',
      filters = []
    } = paginator

    const queryBuilder = this.activityDomainRepository
      .createQueryBuilder('domain')
      .where('domain.orgId = :orgId', { orgId })
      .andWhere('domain.active = :active', { active: true })

    // Apply filters
    filters.forEach((filter) => {
      const { filterType, field, value } = filter
      if (filterType && field && value !== undefined) {
        switch (filterType) {
          case 'like':
            queryBuilder.andWhere(`domain.${field} LIKE :${field}`, {
              [field]: `%${value}%`
            })
            break
          case 'equal':
            queryBuilder.andWhere(`domain.${field} = :${field}`, {
              [field]: value
            })
            break
          case 'moreThan':
            queryBuilder.andWhere(`domain.${field} > :${field}`, {
              [field]: value
            })
            break
          case 'lessThan':
            queryBuilder.andWhere(`domain.${field} < :${field}`, {
              [field]: value
            })
            break
        }
      }
    })

    const totalItems = await queryBuilder.getCount()

    const domains = await queryBuilder
      .orderBy(`domain.${orderBy}`, direction)
      .skip(offset)
      .take(limit)
      .getMany()

    const domainsWithUserRoles = domains.map((domain) => ({
      areaId: domain.areaId,
      name: domain.name,
      percentual: domain.percentual,
      deptId: domain.deptId,
      orgId: domain.orgId,
      teamId: domain.teamId,
      squadId: domain.squadId,
      currentUserRoles: organizationMember.role
    })) as IActivityDomain[]

    const paginatory: Paginator<ActivityDomain> = {
      limit,
      offset,
      orderBy,
      direction,
      filters,
      totalItems
    }

    return {
      paginator: paginatory,
      itens: domainsWithUserRoles
    }
  }

  async getAllByDeptId(
    deptId: number,
    paginator: Paginator<ActivityDomain>,
    currentUser: ValidateUser
  ): Promise<Response<ActivityDomain, IActivityDomain>> {
    const departmentMember = await this.departmentMemberRepository.findOne({
      where: {
        departmentId: deptId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (
      !departmentMember ||
      !departmentMember.role.includes(powers.seeChildren)
    ) {
      throw new NotFoundException(
        'Department not found or insufficient permissions to see activity domains'
      )
    }

    const {
      limit = 20,
      offset = 0,
      orderBy = 'name',
      direction = 'ASC',
      filters = []
    } = paginator

    const queryBuilder = this.activityDomainRepository
      .createQueryBuilder('domain')
      .where('domain.deptId = :deptId', { deptId })
      .andWhere('domain.active = :active', { active: true })

    filters.forEach((filter) => {
      const { filterType, field, value } = filter
      if (filterType && field && value !== undefined) {
        switch (filterType) {
          case 'like':
            queryBuilder.andWhere(`domain.${field} LIKE :${field}`, {
              [field]: `%${value}%`
            })
            break
          case 'equal':
            queryBuilder.andWhere(`domain.${field} = :${field}`, {
              [field]: value
            })
            break
          case 'moreThan':
            queryBuilder.andWhere(`domain.${field} > :${field}`, {
              [field]: value
            })
            break
          case 'lessThan':
            queryBuilder.andWhere(`domain.${field} < :${field}`, {
              [field]: value
            })
            break
        }
      }
    })

    const totalItems = await queryBuilder.getCount()

    const domains = await queryBuilder
      .orderBy(`domain.${orderBy}`, direction)
      .skip(offset)
      .take(limit)
      .getMany()

    const domainsWithUserRoles = domains.map((domain) => ({
      areaId: domain.areaId,
      name: domain.name,
      percentual: domain.percentual,
      deptId: domain.deptId,
      orgId: domain.orgId,
      teamId: domain.teamId,
      squadId: domain.squadId,
      currentUserRoles: departmentMember.role
    })) as IActivityDomain[]

    const paginatory: Paginator<ActivityDomain> = {
      limit,
      offset,
      orderBy,
      direction,
      filters,
      totalItems
    }

    return {
      paginator: paginatory,
      itens: domainsWithUserRoles
    }
  }

  async getAllByTeamId(
    teamId: number,
    paginator: Paginator<ActivityDomain>,
    currentUser: ValidateUser
  ): Promise<Response<ActivityDomain, IActivityDomain>> {
    const teamMember = await this.teamMemberRepository.findOne({
      where: {
        teamId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (!teamMember || !teamMember.role.includes(powers.seeChildren)) {
      throw new NotFoundException(
        'Team not found or insufficient permissions to see activity domains'
      )
    }

    const {
      limit = 20,
      offset = 0,
      orderBy = 'name',
      direction = 'ASC',
      filters = []
    } = paginator

    const queryBuilder = this.activityDomainRepository
      .createQueryBuilder('domain')
      .where('domain.teamId = :teamId', { teamId })
      .andWhere('domain.active = :active', { active: true })

    filters.forEach((filter) => {
      const { filterType, field, value } = filter
      if (filterType && field && value !== undefined) {
        switch (filterType) {
          case 'like':
            queryBuilder.andWhere(`domain.${field} LIKE :${field}`, {
              [field]: `%${value}%`
            })
            break
          case 'equal':
            queryBuilder.andWhere(`domain.${field} = :${field}`, {
              [field]: value
            })
            break
          case 'moreThan':
            queryBuilder.andWhere(`domain.${field} > :${field}`, {
              [field]: value
            })
            break
          case 'lessThan':
            queryBuilder.andWhere(`domain.${field} < :${field}`, {
              [field]: value
            })
            break
        }
      }
    })

    const totalItems = await queryBuilder.getCount()

    const domains = await queryBuilder
      .orderBy(`domain.${orderBy}`, direction)
      .skip(offset)
      .take(limit)
      .getMany()

    const domainsWithUserRoles = domains.map((domain) => ({
      areaId: domain.areaId,
      name: domain.name,
      percentual: domain.percentual,
      deptId: domain.deptId,
      orgId: domain.orgId,
      teamId: domain.teamId,
      squadId: domain.squadId,
      currentUserRoles: teamMember.role
    })) as IActivityDomain[]

    const paginatory: Paginator<ActivityDomain> = {
      limit,
      offset,
      orderBy,
      direction,
      filters,
      totalItems
    }

    return {
      paginator: paginatory,
      itens: domainsWithUserRoles
    }
  }

  async getAllBySquadId(
    squadId: number,
    paginator: Paginator<ActivityDomain>,
    currentUser: ValidateUser
  ): Promise<Response<ActivityDomain, IActivityDomain>> {
    const squadMember = await this.squadMemberRepository.findOne({
      where: {
        squadId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (!squadMember || !squadMember.role.includes(powers.seeChildren)) {
      throw new NotFoundException(
        'Squad not found or insufficient permissions to see activity domains'
      )
    }

    const {
      limit = 20,
      offset = 0,
      orderBy = 'name',
      direction = 'ASC',
      filters = []
    } = paginator

    const queryBuilder = this.activityDomainRepository
      .createQueryBuilder('domain')
      .where('domain.squadId = :squadId', { squadId })
      .andWhere('domain.active = :active', { active: true })

    filters.forEach((filter) => {
      const { filterType, field, value } = filter
      if (filterType && field && value !== undefined) {
        switch (filterType) {
          case 'like':
            queryBuilder.andWhere(`domain.${field} LIKE :${field}`, {
              [field]: `%${value}%`
            })
            break
          case 'equal':
            queryBuilder.andWhere(`domain.${field} = :${field}`, {
              [field]: value
            })
            break
          case 'moreThan':
            queryBuilder.andWhere(`domain.${field} > :${field}`, {
              [field]: value
            })
            break
          case 'lessThan':
            queryBuilder.andWhere(`domain.${field} < :${field}`, {
              [field]: value
            })
            break
        }
      }
    })

    const totalItems = await queryBuilder.getCount()

    const domains = await queryBuilder
      .orderBy(`domain.${orderBy}`, direction)
      .skip(offset)
      .take(limit)
      .getMany()

    const domainsWithUserRoles = domains.map((domain) => ({
      areaId: domain.areaId,
      name: domain.name,
      percentual: domain.percentual,
      deptId: domain.deptId,
      orgId: domain.orgId,
      teamId: domain.teamId,
      squadId: domain.squadId,
      currentUserRoles: squadMember.role
    })) as IActivityDomain[]

    const paginatory: Paginator<ActivityDomain> = {
      limit,
      offset,
      orderBy,
      direction,
      filters,
      totalItems
    }

    return {
      paginator: paginatory,
      itens: domainsWithUserRoles
    }
  }

  async update(
    updateActivityDomainDto: UpdateActivityDomainDto,
    currentUser: ValidateUser
  ): Promise<ActivityDomain> {
    // Find the activity domain
    const activityDomain = await this.activityDomainRepository.findOne({
      where: { areaId: updateActivityDomainDto.areaId, active: true }
    })

    if (!activityDomain) {
      throw new NotFoundException('Activity domain not found')
    }

    // Check if user has editAndDelete power in the parent entity
    let hasPermission = false

    if (activityDomain.orgId) {
      const orgMember = await this.organizationMemberRepository.findOne({
        where: {
          orgId: activityDomain.orgId,
          userId: currentUser.userId,
          active: true
        }
      })
      if (orgMember && orgMember.role.includes(powers.editAndDelete)) {
        hasPermission = true
      }
    } else if (activityDomain.deptId) {
      const deptMember = await this.departmentMemberRepository.findOne({
        where: {
          departmentId: activityDomain.deptId,
          userId: currentUser.userId,
          active: true
        }
      })
      if (deptMember && deptMember.role.includes(powers.editAndDelete)) {
        hasPermission = true
      }
    } else if (activityDomain.teamId) {
      const teamMember = await this.teamMemberRepository.findOne({
        where: {
          teamId: activityDomain.teamId,
          userId: currentUser.userId,
          active: true
        }
      })
      if (teamMember && teamMember.role.includes(powers.editAndDelete)) {
        hasPermission = true
      }
    } else if (activityDomain.squadId) {
      const squadMember = await this.squadMemberRepository.findOne({
        where: {
          squadId: activityDomain.squadId,
          userId: currentUser.userId,
          active: true
        }
      })
      if (squadMember && squadMember.role.includes(powers.editAndDelete)) {
        hasPermission = true
      }
    }

    if (!hasPermission) {
      throw new NotFoundException(
        'Activity domain not found or insufficient permissions'
      )
    }

    // Use preload to load existing entity and apply changes
    const domainToUpdate = await this.activityDomainRepository.preload({
      ...updateActivityDomainDto
    })

    if (!domainToUpdate) {
      throw new NotFoundException('Activity domain not found')
    }

    return await this.activityDomainRepository.save(domainToUpdate)
  }

  async delete(areaId: number, currentUser: ValidateUser): Promise<void> {
    // Find the activity domain
    const activityDomain = await this.activityDomainRepository.findOne({
      where: { areaId, active: true }
    })

    if (!activityDomain) {
      throw new NotFoundException('Activity domain not found')
    }

    // Check if user has editAndDelete power in the parent entity
    let hasPermission = false

    if (activityDomain.orgId) {
      const orgMember = await this.organizationMemberRepository.findOne({
        where: {
          orgId: activityDomain.orgId,
          userId: currentUser.userId,
          active: true
        }
      })
      if (orgMember && orgMember.role.includes(powers.editAndDelete)) {
        hasPermission = true
      }
    } else if (activityDomain.deptId) {
      const deptMember = await this.departmentMemberRepository.findOne({
        where: {
          departmentId: activityDomain.deptId,
          userId: currentUser.userId,
          active: true
        }
      })
      if (deptMember && deptMember.role.includes(powers.editAndDelete)) {
        hasPermission = true
      }
    } else if (activityDomain.teamId) {
      const teamMember = await this.teamMemberRepository.findOne({
        where: {
          teamId: activityDomain.teamId,
          userId: currentUser.userId,
          active: true
        }
      })
      if (teamMember && teamMember.role.includes(powers.editAndDelete)) {
        hasPermission = true
      }
    } else if (activityDomain.squadId) {
      const squadMember = await this.squadMemberRepository.findOne({
        where: {
          squadId: activityDomain.squadId,
          userId: currentUser.userId,
          active: true
        }
      })
      if (squadMember && squadMember.role.includes(powers.editAndDelete)) {
        hasPermission = true
      }
    }

    if (!hasPermission) {
      throw new NotFoundException(
        'Activity domain not found or insufficient permissions'
      )
    }

    // Soft delete by setting active to false
    await this.activityDomainRepository.update(areaId, { active: false })
  }

  async create(
    createActivityDomainDto: CreateActivityDomainDto,
    currentUser: ValidateUser
  ): Promise<ActivityDomain> {
    // Validate that only one parent is provided (or none)
    const parentCount = [
      createActivityDomainDto.orgId,
      createActivityDomainDto.deptId,
      createActivityDomainDto.teamId,
      createActivityDomainDto.squadId
    ].filter((id) => id !== undefined && id !== null).length

    if (parentCount > 1) {
      throw new BadRequestException(
        'Activity domain can belong to either an organization, department, team or squad, but not more than one'
      )
    }

    return await this.dataSource.transaction(async (manager) => {
      // Check permissions based on parent entity
      if (createActivityDomainDto.orgId) {
        const organizationMember =
          await this.organizationMemberRepository.findOne({
            where: {
              orgId: createActivityDomainDto.orgId,
              userId: currentUser.userId,
              active: true
            }
          })

        if (
          !organizationMember ||
          !organizationMember.role.includes(powers.addChildren)
        ) {
          throw new NotFoundException(
            'Organization not found or insufficient permissions to create activity domain'
          )
        }
      }

      if (createActivityDomainDto.deptId) {
        const departmentMember = await this.departmentMemberRepository.findOne({
          where: {
            departmentId: createActivityDomainDto.deptId,
            userId: currentUser.userId,
            active: true
          }
        })

        if (
          !departmentMember ||
          !departmentMember.role.includes(powers.addChildren)
        ) {
          throw new NotFoundException(
            'Department not found or insufficient permissions to create activity domain'
          )
        }
      }

      if (createActivityDomainDto.teamId) {
        const teamMember = await this.teamMemberRepository.findOne({
          where: {
            teamId: createActivityDomainDto.teamId,
            userId: currentUser.userId,
            active: true
          }
        })

        if (!teamMember || !teamMember.role.includes(powers.addChildren)) {
          throw new NotFoundException(
            'Team not found or insufficient permissions to create activity domain'
          )
        }
      }

      if (createActivityDomainDto.squadId) {
        const squadMember = await this.squadMemberRepository.findOne({
          where: {
            squadId: createActivityDomainDto.squadId,
            userId: currentUser.userId,
            active: true
          }
        })

        if (!squadMember || !squadMember.role.includes(powers.addChildren)) {
          throw new NotFoundException(
            'Squad not found or insufficient permissions to create activity domain'
          )
        }
      }

      // Create the activity domain
      const activityDomain = manager.create(ActivityDomain, {
        ...createActivityDomainDto,
        active: true
      })

      return await manager.save(ActivityDomain, activityDomain)
    })
  }
}
