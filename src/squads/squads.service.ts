import {
  Injectable,
  NotFoundException,
  BadRequestException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { powers, userRoleEnum } from '../constants/roles.enum'
import { OrganizationMember } from '../organizations-members/entities/organization-member.entity'
import { DepartmentMember } from '../departments/entities/department-member.entity'
import { TeamMember } from '../teams/entities/team-member.entity'
import { ValidateUser } from '../shared/auth/types'
import { Response } from '../shared/types/response.types'
import { Paginator } from '../shared/types/paginator.types'
import { CreateSquadDto } from './dto/create-squad.dto'
import { UpdateSquadDto } from './dto/update-squad.dto'
import { Squad } from './entities/squad.entity'
import { SquadMember } from './entities/squad-member.entity'
import { ISquad } from './types'
import { SquadsHelper } from './squads.helper'

@Injectable()
export class SquadsService {
  constructor(
    @InjectRepository(Squad)
    private readonly squadRepository: Repository<Squad>,
    @InjectRepository(SquadMember)
    private readonly squadMemberRepository: Repository<SquadMember>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepository: Repository<OrganizationMember>,
    @InjectRepository(DepartmentMember)
    private readonly departmentMemberRepository: Repository<DepartmentMember>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
    private readonly dataSource: DataSource,
    private readonly squadsHelper: SquadsHelper
  ) {}

  async getOne(squadId: number, currentUser: ValidateUser): Promise<ISquad> {
    // Check if user has view power for this squad
    const squad = await this.squadRepository
      .createQueryBuilder('squad')
      .innerJoin(
        'squad_members',
        'member',
        'member.squad_id = squad.squadId AND member.user_id = :userId AND member.active = true',
        { userId: currentUser.userId }
      )
      .where('squad.squadId = :squadId', { squadId })
      .andWhere('member.role LIKE :viewPower', {
        viewPower: `%${powers.view}%`
      })
      .select(['squad.*', 'member.role'])
      .getRawOne()

    if (!squad) {
      throw new NotFoundException('Squad not found or access denied')
    }

    // Get current user member info
    const currentUserMember = await this.squadMemberRepository.findOne({
      where: {
        squadId: squad.squadId,
        userId: currentUser.userId,
        active: true
      }
    })

    return {
      squadId: squad.squadId,
      squadName: squad.squadName,
      squadDescription: squad.squadDescription,
      squadGoals: squad.squadGoals,
      deptId: squad.deptId,
      orgId: squad.orgId,
      teamId: squad.teamId,
      currentUserRoles: currentUserMember?.role || ''
    } as ISquad
  }

  async getAll(
    paginator: Paginator<Squad>,
    currentUser: ValidateUser
  ): Promise<Response<Squad, ISquad>> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'squadName',
      direction = 'ASC',
      filters = []
    } = paginator

    // Build the query to get squads where user is member with view power
    const queryBuilder = this.squadRepository
      .createQueryBuilder('squad')
      .innerJoin(
        'squad_members',
        'member',
        'member.squad_id = squad.squadId AND member.user_id = :userId AND member.active = true',
        { userId: currentUser.userId }
      )
      .where('member.role LIKE :viewPower', { viewPower: `%${powers.view}%` })
      .andWhere('squad.squadActive = :active', { active: true })

    // Apply filters
    filters.forEach((filter) => {
      const { filterType, field, value } = filter
      if (filterType && field && value !== undefined) {
        switch (filterType) {
          case 'like':
            queryBuilder.andWhere(`squad.${field} LIKE :${field}`, {
              [field]: `%${value}%`
            })
            break
          case 'equal':
            queryBuilder.andWhere(`squad.${field} = :${field}`, {
              [field]: value
            })
            break
          case 'moreThan':
            queryBuilder.andWhere(`squad.${field} > :${field}`, {
              [field]: value
            })
            break
          case 'lessThan':
            queryBuilder.andWhere(`squad.${field} < :${field}`, {
              [field]: value
            })
            break
        }
      }
    })

    // Get total count
    const totalItems = await queryBuilder.getCount()

    // Apply pagination and ordering
    const squadsRaw = await queryBuilder
      .select(['squad.*', 'member.role'])
      .orderBy(`squad.${orderBy}`, direction)
      .offset(offset)
      .limit(limit)
      .getRawMany()

    // Transform to ISquad format
    const squadsWithUserRoles = squadsRaw.map((squadRaw) => ({
      squadId: squadRaw.squadId,
      squadName: squadRaw.squadName,
      squadDescription: squadRaw.squadDescription,
      squadGoals: squadRaw.squadGoals,
      deptId: squadRaw.deptId,
      orgId: squadRaw.orgId,
      teamId: squadRaw.teamId,
      currentUserRoles: squadRaw.role || ''
    })) as ISquad[]

    // Build paginator
    const paginatory: Paginator<Squad> = {
      limit,
      offset,
      orderBy,
      direction,
      filters,
      totalItems
    }

    return {
      paginator: paginatory,
      itens: squadsWithUserRoles
    }
  }

  async update(
    updateSquadDto: UpdateSquadDto,
    currentUser: ValidateUser
  ): Promise<Squad> {
    // Check if user has editAndDelete power for this squad
    const squadMember = await this.squadMemberRepository.findOne({
      where: {
        squadId: updateSquadDto.squadId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (!squadMember || !squadMember.role.includes(powers.editAndDelete)) {
      throw new NotFoundException('Squad not found or insufficient permissions')
    }

    // Use preload to load existing entity and apply changes in one go
    const squadToUpdate = await this.squadRepository.preload({
      ...updateSquadDto
    })

    if (!squadToUpdate || !squadToUpdate.squadActive) {
      throw new NotFoundException('Squad not found')
    }

    // Save the updated squad
    return await this.squadRepository.save(squadToUpdate)
  }

  async delete(squadId: number, currentUser: ValidateUser): Promise<void> {
    // Check if user has editAndDelete power for this squad
    const squadMember = await this.squadMemberRepository.findOne({
      where: {
        squadId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (!squadMember || !squadMember.role.includes(powers.editAndDelete)) {
      throw new NotFoundException('Squad not found or insufficient permissions')
    }

    // Check if squad exists and is active
    const squad = await this.squadRepository.findOne({
      where: { squadId, squadActive: true }
    })

    if (!squad) {
      throw new NotFoundException('Squad not found')
    }

    // Soft delete by setting squadActive to false
    await this.squadRepository.update(squadId, { squadActive: false })
  }

  async getAllByOrgId(
    orgId: number,
    paginator: Paginator<Squad>,
    currentUser: ValidateUser
  ): Promise<Response<Squad, ISquad>> {
    // First, check if user has seeChildren power in the organization
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
        'Organization not found or insufficient permissions to see squads'
      )
    }

    const {
      limit = 20,
      offset = 0,
      orderBy = 'squadName',
      direction = 'ASC',
      filters = []
    } = paginator

    // Build the query to get squads of the specified organization
    const queryBuilder = this.squadRepository
      .createQueryBuilder('squad')
      .where('squad.orgId = :orgId', { orgId })
      .andWhere('squad.squadActive = :active', { active: true })

    // Apply filters
    filters.forEach((filter) => {
      const { filterType, field, value } = filter
      if (filterType && field && value !== undefined) {
        switch (filterType) {
          case 'like':
            queryBuilder.andWhere(`squad.${field} LIKE :${field}`, {
              [field]: `%${value}%`
            })
            break
          case 'equal':
            queryBuilder.andWhere(`squad.${field} = :${field}`, {
              [field]: value
            })
            break
          case 'moreThan':
            queryBuilder.andWhere(`squad.${field} > :${field}`, {
              [field]: value
            })
            break
          case 'lessThan':
            queryBuilder.andWhere(`squad.${field} < :${field}`, {
              [field]: value
            })
            break
        }
      }
    })

    // Get total count
    const totalItems = await queryBuilder.getCount()

    // Apply pagination and ordering
    const squads = await queryBuilder
      .orderBy(`squad.${orderBy}`, direction)
      .skip(offset)
      .take(limit)
      .getMany()

    // Get current user role for each squad (if user is member)
    const squadsWithUserRoles = await Promise.all(
      squads.map(async (squad) => {
        const currentUserMember = await this.squadMemberRepository.findOne({
          where: {
            squadId: squad.squadId,
            userId: currentUser.userId,
            active: true
          }
        })

        return {
          squadId: squad.squadId,
          squadName: squad.squadName,
          squadDescription: squad.squadDescription,
          squadGoals: squad.squadGoals,
          deptId: squad.deptId,
          orgId: squad.orgId,
          teamId: squad.teamId,
          currentUserRoles: currentUserMember?.role || ''
        } as ISquad
      })
    )

    // Build paginator
    const paginatory: Paginator<Squad> = {
      limit,
      offset,
      orderBy,
      direction,
      filters,
      totalItems
    }

    return {
      paginator: paginatory,
      itens: squadsWithUserRoles
    }
  }

  async getAllByDeptId(
    deptId: number,
    paginator: Paginator<Squad>,
    currentUser: ValidateUser
  ): Promise<Response<Squad, ISquad>> {
    // First, check if user has seeChildren power in the department
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
        'Department not found or insufficient permissions to see squads'
      )
    }

    const {
      limit = 20,
      offset = 0,
      orderBy = 'squadName',
      direction = 'ASC',
      filters = []
    } = paginator

    // Build the query to get squads of the specified department
    const queryBuilder = this.squadRepository
      .createQueryBuilder('squad')
      .where('squad.deptId = :deptId', { deptId })
      .andWhere('squad.squadActive = :active', { active: true })

    // Apply filters
    filters.forEach((filter) => {
      const { filterType, field, value } = filter
      if (filterType && field && value !== undefined) {
        switch (filterType) {
          case 'like':
            queryBuilder.andWhere(`squad.${field} LIKE :${field}`, {
              [field]: `%${value}%`
            })
            break
          case 'equal':
            queryBuilder.andWhere(`squad.${field} = :${field}`, {
              [field]: value
            })
            break
          case 'moreThan':
            queryBuilder.andWhere(`squad.${field} > :${field}`, {
              [field]: value
            })
            break
          case 'lessThan':
            queryBuilder.andWhere(`squad.${field} < :${field}`, {
              [field]: value
            })
            break
        }
      }
    })

    // Get total count
    const totalItems = await queryBuilder.getCount()

    // Apply pagination and ordering
    const squads = await queryBuilder
      .orderBy(`squad.${orderBy}`, direction)
      .skip(offset)
      .take(limit)
      .getMany()

    // Get current user role for each squad (if user is member)
    const squadsWithUserRoles = await Promise.all(
      squads.map(async (squad) => {
        const currentUserMember = await this.squadMemberRepository.findOne({
          where: {
            squadId: squad.squadId,
            userId: currentUser.userId,
            active: true
          }
        })

        return {
          squadId: squad.squadId,
          squadName: squad.squadName,
          squadDescription: squad.squadDescription,
          squadGoals: squad.squadGoals,
          deptId: squad.deptId,
          orgId: squad.orgId,
          teamId: squad.teamId,
          currentUserRoles: currentUserMember?.role || ''
        } as ISquad
      })
    )

    // Build paginator
    const paginatory: Paginator<Squad> = {
      limit,
      offset,
      orderBy,
      direction,
      filters,
      totalItems
    }

    return {
      paginator: paginatory,
      itens: squadsWithUserRoles
    }
  }

  async getAllByTeamId(
    teamId: number,
    paginator: Paginator<Squad>,
    currentUser: ValidateUser
  ): Promise<Response<Squad, ISquad>> {
    // First, check if user has seeChildren power in the team
    const teamMember = await this.teamMemberRepository.findOne({
      where: {
        teamId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (!teamMember || !teamMember.role.includes(powers.seeChildren)) {
      throw new NotFoundException(
        'Team not found or insufficient permissions to see squads'
      )
    }

    const {
      limit = 20,
      offset = 0,
      orderBy = 'squadName',
      direction = 'ASC',
      filters = []
    } = paginator

    // Build the query to get squads of the specified team
    const queryBuilder = this.squadRepository
      .createQueryBuilder('squad')
      .where('squad.teamId = :teamId', { teamId })
      .andWhere('squad.squadActive = :active', { active: true })

    // Apply filters
    filters.forEach((filter) => {
      const { filterType, field, value } = filter
      if (filterType && field && value !== undefined) {
        switch (filterType) {
          case 'like':
            queryBuilder.andWhere(`squad.${field} LIKE :${field}`, {
              [field]: `%${value}%`
            })
            break
          case 'equal':
            queryBuilder.andWhere(`squad.${field} = :${field}`, {
              [field]: value
            })
            break
          case 'moreThan':
            queryBuilder.andWhere(`squad.${field} > :${field}`, {
              [field]: value
            })
            break
          case 'lessThan':
            queryBuilder.andWhere(`squad.${field} < :${field}`, {
              [field]: value
            })
            break
        }
      }
    })

    // Get total count
    const totalItems = await queryBuilder.getCount()

    // Apply pagination and ordering
    const squads = await queryBuilder
      .orderBy(`squad.${orderBy}`, direction)
      .skip(offset)
      .take(limit)
      .getMany()

    // Get current user role for each squad (if user is member)
    const squadsWithUserRoles = await Promise.all(
      squads.map(async (squad) => {
        const currentUserMember = await this.squadMemberRepository.findOne({
          where: {
            squadId: squad.squadId,
            userId: currentUser.userId,
            active: true
          }
        })

        return {
          squadId: squad.squadId,
          squadName: squad.squadName,
          squadDescription: squad.squadDescription,
          squadGoals: squad.squadGoals,
          deptId: squad.deptId,
          orgId: squad.orgId,
          teamId: squad.teamId,
          currentUserRoles: currentUserMember?.role || ''
        } as ISquad
      })
    )

    // Build paginator
    const paginatory: Paginator<Squad> = {
      limit,
      offset,
      orderBy,
      direction,
      filters,
      totalItems
    }

    return {
      paginator: paginatory,
      itens: squadsWithUserRoles
    }
  }

  async create(
    createSquadDto: CreateSquadDto,
    currentUser: ValidateUser
  ): Promise<Squad> {
    // Validate that only one parent is provided (or none)
    const parentCount = [
      createSquadDto.orgId,
      createSquadDto.deptId,
      createSquadDto.teamId
    ].filter((id) => id !== undefined && id !== null).length

    if (parentCount > 1) {
      throw new BadRequestException(
        'Squad can belong to either an organization, department or team, but not more than one'
      )
    }

    return await this.dataSource.transaction(async (manager) => {
      // If orgId is provided, check if user has addChildren permission in that organization
      if (createSquadDto.orgId) {
        const organizationMember =
          await this.organizationMemberRepository.findOne({
            where: {
              orgId: createSquadDto.orgId,
              userId: currentUser.userId,
              active: true
            }
          })

        if (
          !organizationMember ||
          !organizationMember.role.includes(powers.addChildren)
        ) {
          throw new NotFoundException(
            'Organization not found or insufficient permissions to create squad'
          )
        }
      }

      // If deptId is provided, check if user has addChildren permission in that department
      if (createSquadDto.deptId) {
        const departmentMember = await this.departmentMemberRepository.findOne({
          where: {
            departmentId: createSquadDto.deptId,
            userId: currentUser.userId,
            active: true
          }
        })

        if (
          !departmentMember ||
          !departmentMember.role.includes(powers.addChildren)
        ) {
          throw new NotFoundException(
            'Department not found or insufficient permissions to create squad'
          )
        }
      }

      // If teamId is provided, check if user has addChildren permission in that team
      if (createSquadDto.teamId) {
        const teamMember = await this.teamMemberRepository.findOne({
          where: {
            teamId: createSquadDto.teamId,
            userId: currentUser.userId,
            active: true
          }
        })

        if (!teamMember || !teamMember.role.includes(powers.addChildren)) {
          throw new NotFoundException(
            'Team not found or insufficient permissions to create squad'
          )
        }
      }

      // Create the squad
      const squad = manager.create(Squad, {
        ...createSquadDto,
        squadActive: true
      })

      const savedSquad = await manager.save(Squad, squad)

      // Create the squad member with OWNER role
      const squadMember = manager.create(SquadMember, {
        userId: currentUser.userId,
        squadId: savedSquad.squadId,
        role: userRoleEnum.OWNER,
        active: true
      })

      await manager.save(SquadMember, squadMember)

      return savedSquad
    })
  }
}
