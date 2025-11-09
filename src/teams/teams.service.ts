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
import { ValidateUser } from '../shared/auth/types'
import { Response } from '../shared/types/response.types'
import { Paginator } from '../shared/types/paginator.types'
import { CreateTeamDto } from './dto/create-team.dto'
import { UpdateTeamDto } from './dto/update-team.dto'
import { Team } from './entities/team.entity'
import { TeamMember } from './entities/team-member.entity'
import { ITeam } from './types'
import { TeamsHelper } from './teams.helper'

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepository: Repository<OrganizationMember>,
    @InjectRepository(DepartmentMember)
    private readonly departmentMemberRepository: Repository<DepartmentMember>,
    private readonly dataSource: DataSource,
    private readonly teamsHelper: TeamsHelper
  ) {}

  async getOne(teamId: number, currentUser: ValidateUser): Promise<ITeam> {
    // Check if user has view power for this team
    const team = await this.teamRepository
      .createQueryBuilder('team')
      .innerJoin(
        'team_members',
        'member',
        'member.team_id = team.teamId AND member.user_id = :userId AND member.active = true',
        { userId: currentUser.userId }
      )
      .where('team.teamId = :teamId', { teamId })
      .andWhere('member.role LIKE :viewPower', {
        viewPower: `%${powers.view}%`
      })
      .select(['team.*', 'member.role'])
      .getRawOne()

    if (!team) {
      throw new NotFoundException('Team not found or access denied')
    }

    // Get current user member info
    const currentUserMember = await this.teamMemberRepository.findOne({
      where: {
        teamId: team.teamId,
        userId: currentUser.userId,
        active: true
      }
    })

    return {
      teamId: team.teamId,
      teamName: team.teamName,
      teamDescription: team.teamDescription,
      teamGoals: team.teamGoals,
      deptId: team.deptId,
      orgId: team.orgId,
      currentUserRoles: currentUserMember?.role || ''
    } as ITeam
  }

  async getAll(
    paginator: Paginator<Team>,
    currentUser: ValidateUser
  ): Promise<Response<Team, ITeam>> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'teamName',
      direction = 'ASC',
      filters = []
    } = paginator

    // Build the query to get teams where user is member with view power
    const queryBuilder = this.teamRepository
      .createQueryBuilder('team')
      .innerJoin(
        'team_members',
        'member',
        'member.team_id = team.teamId AND member.user_id = :userId AND member.active = true',
        { userId: currentUser.userId }
      )
      .where('member.role LIKE :viewPower', { viewPower: `%${powers.view}%` })
      .andWhere('team.teamActive = :active', { active: true })

    // Apply filters
    filters.forEach((filter) => {
      const { filterType, field, value } = filter
      if (filterType && field && value !== undefined) {
        switch (filterType) {
          case 'like':
            queryBuilder.andWhere(`team.${field} LIKE :${field}`, {
              [field]: `%${value}%`
            })
            break
          case 'equal':
            queryBuilder.andWhere(`team.${field} = :${field}`, {
              [field]: value
            })
            break
          case 'moreThan':
            queryBuilder.andWhere(`team.${field} > :${field}`, {
              [field]: value
            })
            break
          case 'lessThan':
            queryBuilder.andWhere(`team.${field} < :${field}`, {
              [field]: value
            })
            break
        }
      }
    })

    // Get total count
    const totalItems = await queryBuilder.getCount()

    // Apply pagination and ordering
    const teamsRaw = await queryBuilder
      .select(['team.*', 'member.role'])
      .orderBy(`team.${orderBy}`, direction)
      .offset(offset)
      .limit(limit)
      .getRawMany()

    // Transform to ITeam format
    const teamsWithUserRoles = teamsRaw.map((teamRaw) => ({
      teamId: teamRaw.teamId,
      teamName: teamRaw.teamName,
      teamDescription: teamRaw.teamDescription,
      teamGoals: teamRaw.teamGoals,
      deptId: teamRaw.deptId,
      orgId: teamRaw.orgId,
      currentUserRoles: teamRaw.role || ''
    })) as ITeam[]

    // Build paginator
    const paginatory: Paginator<Team> = {
      limit,
      offset,
      orderBy,
      direction,
      filters,
      totalItems
    }

    return {
      paginator: paginatory,
      itens: teamsWithUserRoles
    }
  }

  async update(
    updateTeamDto: UpdateTeamDto,
    currentUser: ValidateUser
  ): Promise<Team> {
    // Check if user has editAndDelete power for this team
    const teamMember = await this.teamMemberRepository.findOne({
      where: {
        teamId: updateTeamDto.teamId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (!teamMember || !teamMember.role.includes(powers.editAndDelete)) {
      throw new NotFoundException('Team not found or insufficient permissions')
    }

    // Use preload to load existing entity and apply changes in one go
    const teamToUpdate = await this.teamRepository.preload({
      ...updateTeamDto
    })

    if (!teamToUpdate || !teamToUpdate.teamActive) {
      throw new NotFoundException('Team not found')
    }

    // Save the updated team
    return await this.teamRepository.save(teamToUpdate)
  }

  async delete(teamId: number, currentUser: ValidateUser): Promise<void> {
    // Check if user has editAndDelete power for this team
    const teamMember = await this.teamMemberRepository.findOne({
      where: {
        teamId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (!teamMember || !teamMember.role.includes(powers.editAndDelete)) {
      throw new NotFoundException('Team not found or insufficient permissions')
    }

    // Check if team exists and is active
    const team = await this.teamRepository.findOne({
      where: { teamId, teamActive: true }
    })

    if (!team) {
      throw new NotFoundException('Team not found')
    }

    // Soft delete by setting teamActive to false
    await this.teamRepository.update(teamId, { teamActive: false })
  }

  async getAllByOrgId(
    orgId: number,
    paginator: Paginator<Team>,
    currentUser: ValidateUser
  ): Promise<Response<Team, ITeam>> {
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
        'Organization not found or insufficient permissions to see teams'
      )
    }

    const {
      limit = 20,
      offset = 0,
      orderBy = 'teamName',
      direction = 'ASC',
      filters = []
    } = paginator

    // Build the query to get teams of the specified organization
    const queryBuilder = this.teamRepository
      .createQueryBuilder('team')
      .where('team.orgId = :orgId', { orgId })
      .andWhere('team.teamActive = :active', { active: true })

    // Apply filters
    filters.forEach((filter) => {
      const { filterType, field, value } = filter
      if (filterType && field && value !== undefined) {
        switch (filterType) {
          case 'like':
            queryBuilder.andWhere(`team.${field} LIKE :${field}`, {
              [field]: `%${value}%`
            })
            break
          case 'equal':
            queryBuilder.andWhere(`team.${field} = :${field}`, {
              [field]: value
            })
            break
          case 'moreThan':
            queryBuilder.andWhere(`team.${field} > :${field}`, {
              [field]: value
            })
            break
          case 'lessThan':
            queryBuilder.andWhere(`team.${field} < :${field}`, {
              [field]: value
            })
            break
        }
      }
    })

    // Get total count
    const totalItems = await queryBuilder.getCount()

    // Apply pagination and ordering
    const teams = await queryBuilder
      .orderBy(`team.${orderBy}`, direction)
      .skip(offset)
      .take(limit)
      .getMany()

    // Get current user role for each team (if user is member)
    const teamsWithUserRoles = await Promise.all(
      teams.map(async (team) => {
        const currentUserMember = await this.teamMemberRepository.findOne({
          where: {
            teamId: team.teamId,
            userId: currentUser.userId,
            active: true
          }
        })

        return {
          teamId: team.teamId,
          teamName: team.teamName,
          teamDescription: team.teamDescription,
          teamGoals: team.teamGoals,
          deptId: team.deptId,
          orgId: team.orgId,
          currentUserRoles: currentUserMember?.role || ''
        } as ITeam
      })
    )

    // Build paginator
    const paginatory: Paginator<Team> = {
      limit,
      offset,
      orderBy,
      direction,
      filters,
      totalItems
    }

    return {
      paginator: paginatory,
      itens: teamsWithUserRoles
    }
  }

  async getAllByDeptId(
    deptId: number,
    paginator: Paginator<Team>,
    currentUser: ValidateUser
  ): Promise<Response<Team, ITeam>> {
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
        'Department not found or insufficient permissions to see teams'
      )
    }

    const {
      limit = 20,
      offset = 0,
      orderBy = 'teamName',
      direction = 'ASC',
      filters = []
    } = paginator

    // Build the query to get teams of the specified department
    const queryBuilder = this.teamRepository
      .createQueryBuilder('team')
      .where('team.deptId = :deptId', { deptId })
      .andWhere('team.teamActive = :active', { active: true })

    // Apply filters
    filters.forEach((filter) => {
      const { filterType, field, value } = filter
      if (filterType && field && value !== undefined) {
        switch (filterType) {
          case 'like':
            queryBuilder.andWhere(`team.${field} LIKE :${field}`, {
              [field]: `%${value}%`
            })
            break
          case 'equal':
            queryBuilder.andWhere(`team.${field} = :${field}`, {
              [field]: value
            })
            break
          case 'moreThan':
            queryBuilder.andWhere(`team.${field} > :${field}`, {
              [field]: value
            })
            break
          case 'lessThan':
            queryBuilder.andWhere(`team.${field} < :${field}`, {
              [field]: value
            })
            break
        }
      }
    })

    // Get total count
    const totalItems = await queryBuilder.getCount()

    // Apply pagination and ordering
    const teams = await queryBuilder
      .orderBy(`team.${orderBy}`, direction)
      .skip(offset)
      .take(limit)
      .getMany()

    // Get current user role for each team (if user is member)
    const teamsWithUserRoles = await Promise.all(
      teams.map(async (team) => {
        const currentUserMember = await this.teamMemberRepository.findOne({
          where: {
            teamId: team.teamId,
            userId: currentUser.userId,
            active: true
          }
        })

        return {
          teamId: team.teamId,
          teamName: team.teamName,
          teamDescription: team.teamDescription,
          teamGoals: team.teamGoals,
          deptId: team.deptId,
          orgId: team.orgId,
          currentUserRoles: currentUserMember?.role || ''
        } as ITeam
      })
    )

    // Build paginator
    const paginatory: Paginator<Team> = {
      limit,
      offset,
      orderBy,
      direction,
      filters,
      totalItems
    }

    return {
      paginator: paginatory,
      itens: teamsWithUserRoles
    }
  }

  async create(
    createTeamDto: CreateTeamDto,
    currentUser: ValidateUser
  ): Promise<Team> {
    // Validate that only one parent is provided (or none)
    if (createTeamDto.orgId && createTeamDto.deptId) {
      throw new BadRequestException(
        'Team can belong to either an organization or a department, but not both'
      )
    }

    return await this.dataSource.transaction(async (manager) => {
      // If orgId is provided, check if user has addChildren permission in that organization
      if (createTeamDto.orgId) {
        const organizationMember =
          await this.organizationMemberRepository.findOne({
            where: {
              orgId: createTeamDto.orgId,
              userId: currentUser.userId,
              active: true
            }
          })

        if (
          !organizationMember ||
          !organizationMember.role.includes(powers.addChildren)
        ) {
          throw new NotFoundException(
            'Organization not found or insufficient permissions to create team'
          )
        }
      }

      // If deptId is provided, check if user has addChildren permission in that department
      if (createTeamDto.deptId) {
        const departmentMember = await this.departmentMemberRepository.findOne({
          where: {
            departmentId: createTeamDto.deptId,
            userId: currentUser.userId,
            active: true
          }
        })

        if (
          !departmentMember ||
          !departmentMember.role.includes(powers.addChildren)
        ) {
          throw new NotFoundException(
            'Department not found or insufficient permissions to create team'
          )
        }
      }

      // Create the team
      const team = manager.create(Team, {
        ...createTeamDto,
        teamActive: true
      })

      const savedTeam = await manager.save(Team, team)

      // Create the team member with OWNER role
      const teamMember = manager.create(TeamMember, {
        userId: currentUser.userId,
        teamId: savedTeam.teamId,
        role: userRoleEnum.OWNER,
        active: true
      })

      await manager.save(TeamMember, teamMember)

      return savedTeam
    })
  }
}
