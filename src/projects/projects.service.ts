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
import { ActivityDomain } from '../activity-domains/entities/activity-domain.entity'
import { ValidateUser } from '../shared/auth/types'
import { Response } from '../shared/types/response.types'
import { Paginator } from '../shared/types/paginator.types'
import { CreateProjectDto } from './dto/create-project.dto'
import { UpdateProjectDto } from './dto/update-project.dto'
import { Project } from './entities/project.entity'
import { ProjectMember } from './entities/project-member.entity'
import { IProject } from './types'
import { ProjectsHelper } from './projects.helper'

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepository: Repository<OrganizationMember>,
    @InjectRepository(DepartmentMember)
    private readonly departmentMemberRepository: Repository<DepartmentMember>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(SquadMember)
    private readonly squadMemberRepository: Repository<SquadMember>,
    @InjectRepository(ActivityDomain)
    private readonly activityDomainRepository: Repository<ActivityDomain>,
    private readonly dataSource: DataSource,
    private readonly projectsHelper: ProjectsHelper
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
    currentUser: ValidateUser
  ): Promise<IProject> {
    const { orgId, deptId, teamId, squadId, activityDomainId } =
      createProjectDto

    // Validate single parent (not mother)
    const parentCount = [orgId, deptId, teamId, squadId].filter(
      (id) => id !== undefined && id !== null
    ).length
    if (parentCount > 1) {
      throw new BadRequestException(
        'Project can have only one parent (organization, department, team, or squad)'
      )
    }

    // Validate activityDomain if provided
    if (activityDomainId) {
      const activityDomain = await this.activityDomainRepository.findOne({
        where: { areaId: activityDomainId, activityDomainActive: true }
      })

      if (!activityDomain) {
        throw new NotFoundException('Activity domain not found')
      }

      // Project has a parent - validate area belongs to same parent
      if (orgId) {
        if (activityDomain.orgId !== orgId) {
          throw new BadRequestException(
            'Activity domain must belong to the same organization as the project'
          )
        }
      } else if (deptId) {
        if (activityDomain.deptId !== deptId) {
          throw new BadRequestException(
            'Activity domain must belong to the same department as the project'
          )
        }
      } else if (teamId) {
        if (activityDomain.teamId !== teamId) {
          throw new BadRequestException(
            'Activity domain must belong to the same team as the project'
          )
        }
      } else if (squadId) {
        if (activityDomain.squadId !== squadId) {
          throw new BadRequestException(
            'Activity domain must belong to the same squad as the project'
          )
        }
      } else {
        // Project has no parent - area must also have no parent and same owner
        const activityDomainHasParent = !!(
          activityDomain.orgId ||
          activityDomain.deptId ||
          activityDomain.teamId ||
          activityDomain.squadId
        )
        if (activityDomainHasParent) {
          throw new BadRequestException(
            'Activity domain must have no parent when project has no parent'
          )
        }
      }
    }

    // Check if user has permission to create in the parent
    if (orgId) {
      const orgMember = await this.organizationMemberRepository.findOne({
        where: { userId: currentUser.userId, orgId, active: true }
      })
      if (!orgMember || !orgMember.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add projects to this organization'
        )
      }
    } else if (deptId) {
      const deptMember = await this.departmentMemberRepository.findOne({
        where: {
          userId: currentUser.userId,
          departmentId: deptId,
          active: true
        }
      })
      if (!deptMember || !deptMember.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add projects to this department'
        )
      }
    } else if (teamId) {
      const teamMember = await this.teamMemberRepository.findOne({
        where: { userId: currentUser.userId, teamId, active: true }
      })
      if (!teamMember || !teamMember.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add projects to this team'
        )
      }
    } else if (squadId) {
      const squadMember = await this.squadMemberRepository.findOne({
        where: { userId: currentUser.userId, squadId, active: true }
      })
      if (!squadMember || !squadMember.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add projects to this squad'
        )
      }
    }

    // Create the project with transaction
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const project = this.projectRepository.create({
        ...createProjectDto,
        projectActive: true
      })

      const savedProject = await queryRunner.manager.save(project)

      // Add creator as member with full powers
      const projectMember = this.projectMemberRepository.create({
        userId: currentUser.userId,
        projectId: savedProject.projectId,
        role: `${powers.view},${powers.editAndDelete},${powers.addChildren}`,
        active: true
      })

      await queryRunner.manager.save(projectMember)

      await queryRunner.commitTransaction()

      return {
        projectId: savedProject.projectId,
        projectName: savedProject.projectName,
        projectDescription: savedProject.projectDescription,
        projectStartDate: savedProject.projectStartDate,
        projectEndDate: savedProject.projectEndDate,
        projectStatus: savedProject.projectStatus,
        projectDeadline: savedProject.projectDeadline,
        projectGoals: savedProject.projectGoals,
        orgId: savedProject.orgId,
        deptId: savedProject.deptId,
        teamId: savedProject.teamId,
        squadId: savedProject.squadId,
        activityDomainId: savedProject.activityDomainId,
        projectActive: savedProject.projectActive,
        userRole: projectMember.role
      }
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  async getOne(
    projectId: number,
    currentUser: ValidateUser
  ): Promise<IProject> {
    const project = await this.projectRepository
      .createQueryBuilder('project')
      .innerJoin(
        'project_members',
        'member',
        'member.project_id = project.projectId AND member.user_id = :userId AND member.active = true',
        { userId: currentUser.userId }
      )
      .where('project.projectId = :projectId', { projectId })
      .andWhere('project.projectActive = true')
      .andWhere('member.role LIKE :viewPower', {
        viewPower: `%${powers.view}%`
      })
      .select(['project.*', 'member.role'])
      .getRawOne()

    if (!project) {
      throw new NotFoundException('Project not found or access denied')
    }

    const currentUserMember = await this.projectMemberRepository.findOne({
      where: {
        projectId: project.projectId,
        userId: currentUser.userId,
        active: true
      }
    })

    return {
      projectId: project.projectId,
      projectName: project.projectName,
      projectDescription: project.projectDescription,
      projectStartDate: project.projectStartDate,
      projectEndDate: project.projectEndDate,
      projectStatus: project.projectStatus,
      projectDeadline: project.projectDeadline,
      projectGoals: project.projectGoals,
      orgId: project.orgId,
      deptId: project.deptId,
      teamId: project.teamId,
      squadId: project.squadId,
      activityDomainId: project.activityDomainId,
      projectActive: project.projectActive,
      userRole: currentUserMember?.role || ''
    }
  }

  async getAll(
    paginator: Paginator<Project>,
    currentUser: ValidateUser
  ): Promise<Response<Project, IProject>> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'projectName',
      direction = 'ASC',
      filters = []
    } = paginator

    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .innerJoin(
        'project_members',
        'member',
        'member.project_id = project.projectId AND member.user_id = :userId AND member.active = true',
        { userId: currentUser.userId }
      )
      .where('project.projectActive = true')
      .andWhere('member.role LIKE :viewPower', {
        viewPower: `%${powers.view}%`
      })

    // Apply filters
    filters.forEach((filter) => {
      if (filter.value !== undefined && filter.value !== null) {
        queryBuilder.andWhere(`project.${filter.field} = :${filter.field}`, {
          [filter.field]: filter.value
        })
      }
    })

    const projects = await queryBuilder
      .orderBy(`project.${orderBy}`, direction)
      .skip(offset)
      .take(limit)
      .select(['project.*', 'member.role'])
      .getRawMany()

    const projectsWithUserRoles = projects.map((project) => ({
      projectId: project.projectId,
      projectName: project.projectName,
      projectDescription: project.projectDescription,
      projectStartDate: project.projectStartDate,
      projectEndDate: project.projectEndDate,
      projectStatus: project.projectStatus,
      projectDeadline: project.projectDeadline,
      projectGoals: project.projectGoals,
      orgId: project.orgId,
      deptId: project.deptId,
      teamId: project.teamId,
      squadId: project.squadId,
      activityDomainId: project.activityDomainId,
      projectActive: project.projectActive,
      userRole: project.role
    }))

    return {
      paginator: paginator,
      itens: projectsWithUserRoles
    }
  }

  async getAllByOrganizationId(
    orgId: number,
    paginator: Paginator<Project>,
    currentUser: ValidateUser
  ): Promise<Response<Project, IProject>> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'projectName',
      direction = 'ASC'
    } = paginator

    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .innerJoin(
        'project_members',
        'member',
        'member.project_id = project.projectId AND member.user_id = :userId AND member.active = true',
        { userId: currentUser.userId }
      )
      .where('project.orgId = :orgId', { orgId })
      .andWhere('project.projectActive = true')
      .andWhere('member.role LIKE :viewPower', {
        viewPower: `%${powers.view}%`
      })

    const projects = await queryBuilder
      .orderBy(`project.${orderBy}`, direction)
      .skip(offset)
      .take(limit)
      .select(['project.*', 'member.role'])
      .getRawMany()

    const projectsWithUserRoles = projects.map((project) => ({
      projectId: project.projectId,
      projectName: project.projectName,
      projectDescription: project.projectDescription,
      projectStartDate: project.projectStartDate,
      projectEndDate: project.projectEndDate,
      projectStatus: project.projectStatus,
      projectDeadline: project.projectDeadline,
      projectGoals: project.projectGoals,
      orgId: project.orgId,
      deptId: project.deptId,
      teamId: project.teamId,
      squadId: project.squadId,
      activityDomainId: project.activityDomainId,
      projectActive: project.projectActive,
      userRole: project.role
    }))

    return {
      paginator: paginator,
      itens: projectsWithUserRoles
    }
  }

  async getAllByDepartmentId(
    deptId: number,
    paginator: Paginator<Project>,
    currentUser: ValidateUser
  ): Promise<Response<Project, IProject>> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'projectName',
      direction = 'ASC'
    } = paginator

    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .innerJoin(
        'project_members',
        'member',
        'member.project_id = project.projectId AND member.user_id = :userId AND member.active = true',
        { userId: currentUser.userId }
      )
      .where('project.deptId = :deptId', { deptId })
      .andWhere('project.projectActive = true')
      .andWhere('member.role LIKE :viewPower', {
        viewPower: `%${powers.view}%`
      })

    const projects = await queryBuilder
      .orderBy(`project.${orderBy}`, direction)
      .skip(offset)
      .take(limit)
      .select(['project.*', 'member.role'])
      .getRawMany()

    const projectsWithUserRoles = projects.map((project) => ({
      projectId: project.projectId,
      projectName: project.projectName,
      projectDescription: project.projectDescription,
      projectStartDate: project.projectStartDate,
      projectEndDate: project.projectEndDate,
      projectStatus: project.projectStatus,
      projectDeadline: project.projectDeadline,
      projectGoals: project.projectGoals,
      orgId: project.orgId,
      deptId: project.deptId,
      teamId: project.teamId,
      squadId: project.squadId,
      activityDomainId: project.activityDomainId,
      projectActive: project.projectActive,
      userRole: project.role
    }))

    return {
      paginator: paginator,
      itens: projectsWithUserRoles
    }
  }

  async getAllByTeamId(
    teamId: number,
    paginator: Paginator<Project>,
    currentUser: ValidateUser
  ): Promise<Response<Project, IProject>> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'projectName',
      direction = 'ASC'
    } = paginator

    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .innerJoin(
        'project_members',
        'member',
        'member.project_id = project.projectId AND member.user_id = :userId AND member.active = true',
        { userId: currentUser.userId }
      )
      .where('project.teamId = :teamId', { teamId })
      .andWhere('project.projectActive = true')
      .andWhere('member.role LIKE :viewPower', {
        viewPower: `%${powers.view}%`
      })

    const projects = await queryBuilder
      .orderBy(`project.${orderBy}`, direction)
      .skip(offset)
      .take(limit)
      .select(['project.*', 'member.role'])
      .getRawMany()

    const projectsWithUserRoles = projects.map((project) => ({
      projectId: project.projectId,
      projectName: project.projectName,
      projectDescription: project.projectDescription,
      projectStartDate: project.projectStartDate,
      projectEndDate: project.projectEndDate,
      projectStatus: project.projectStatus,
      projectDeadline: project.projectDeadline,
      projectGoals: project.projectGoals,
      orgId: project.orgId,
      deptId: project.deptId,
      teamId: project.teamId,
      squadId: project.squadId,
      activityDomainId: project.activityDomainId,
      projectActive: project.projectActive,
      userRole: project.role
    }))

    return {
      paginator: paginator,
      itens: projectsWithUserRoles
    }
  }

  async getAllBySquadId(
    squadId: number,
    paginator: Paginator<Project>,
    currentUser: ValidateUser
  ): Promise<Response<Project, IProject>> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'projectName',
      direction = 'ASC'
    } = paginator

    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .innerJoin(
        'project_members',
        'member',
        'member.project_id = project.projectId AND member.user_id = :userId AND member.active = true',
        { userId: currentUser.userId }
      )
      .where('project.squadId = :squadId', { squadId })
      .andWhere('project.projectActive = true')
      .andWhere('member.role LIKE :viewPower', {
        viewPower: `%${powers.view}%`
      })

    const projects = await queryBuilder
      .orderBy(`project.${orderBy}`, direction)
      .skip(offset)
      .take(limit)
      .select(['project.*', 'member.role'])
      .getRawMany()

    const projectsWithUserRoles = projects.map((project) => ({
      projectId: project.projectId,
      projectName: project.projectName,
      projectDescription: project.projectDescription,
      projectStartDate: project.projectStartDate,
      projectEndDate: project.projectEndDate,
      projectStatus: project.projectStatus,
      projectDeadline: project.projectDeadline,
      projectGoals: project.projectGoals,
      orgId: project.orgId,
      deptId: project.deptId,
      teamId: project.teamId,
      squadId: project.squadId,
      activityDomainId: project.activityDomainId,
      projectActive: project.projectActive,
      userRole: project.role
    }))

    return {
      paginator: paginator,
      itens: projectsWithUserRoles
    }
  }

  async getAllByActivityDomainId(
    activityDomainId: number,
    paginator: Paginator<Project>,
    currentUser: ValidateUser
  ): Promise<Response<Project, IProject>> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'projectName',
      direction = 'ASC'
    } = paginator

    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .innerJoin(
        'project_members',
        'member',
        'member.project_id = project.projectId AND member.user_id = :userId AND member.active = true',
        { userId: currentUser.userId }
      )
      .where('project.activityDomainId = :activityDomainId', {
        activityDomainId
      })
      .andWhere('project.projectActive = true')
      .andWhere('member.role LIKE :viewPower', {
        viewPower: `%${powers.view}%`
      })

    const projects = await queryBuilder
      .orderBy(`project.${orderBy}`, direction)
      .skip(offset)
      .take(limit)
      .select(['project.*', 'member.role'])
      .getRawMany()

    const projectsWithUserRoles = projects.map((project) => ({
      projectId: project.projectId,
      projectName: project.projectName,
      projectDescription: project.projectDescription,
      projectStartDate: project.projectStartDate,
      projectEndDate: project.projectEndDate,
      projectStatus: project.projectStatus,
      projectDeadline: project.projectDeadline,
      projectGoals: project.projectGoals,
      orgId: project.orgId,
      deptId: project.deptId,
      teamId: project.teamId,
      squadId: project.squadId,
      activityDomainId: project.activityDomainId,
      projectActive: project.projectActive,
      userRole: project.role
    }))

    return {
      paginator: paginator,
      itens: projectsWithUserRoles
    }
  }

  async update(
    updateProjectDto: UpdateProjectDto,
    currentUser: ValidateUser
  ): Promise<IProject> {
    const { projectId, activityDomainId } = updateProjectDto

    // Check if user has edit permission
    const member = await this.projectMemberRepository.findOne({
      where: {
        projectId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (!member || !member.role.includes(powers.editAndDelete)) {
      throw new BadRequestException(
        'User does not have permission to edit this project'
      )
    }

    const project = await this.projectRepository.findOne({
      where: { projectId, projectActive: true }
    })

    if (!project) {
      throw new NotFoundException('Project not found')
    }

    // Validate activityDomain if being updated
    if (activityDomainId !== undefined) {
      if (activityDomainId === null) {
        // Allow removing area
        project.activityDomainId = undefined
      } else {
        const activityDomain = await this.activityDomainRepository.findOne({
          where: { areaId: activityDomainId, activityDomainActive: true }
        })

        if (!activityDomain) {
          throw new NotFoundException('Activity domain not found')
        }

        // Get the parent from DTO or existing project
        const orgId = updateProjectDto.orgId ?? project.orgId
        const deptId = updateProjectDto.deptId ?? project.deptId
        const teamId = updateProjectDto.teamId ?? project.teamId
        const squadId = updateProjectDto.squadId ?? project.squadId

        // Validate area belongs to same parent
        if (orgId) {
          if (activityDomain.orgId !== orgId) {
            throw new BadRequestException(
              'Activity domain must belong to the same organization as the project'
            )
          }
        } else if (deptId) {
          if (activityDomain.deptId !== deptId) {
            throw new BadRequestException(
              'Activity domain must belong to the same department as the project'
            )
          }
        } else if (teamId) {
          if (activityDomain.teamId !== teamId) {
            throw new BadRequestException(
              'Activity domain must belong to the same team as the project'
            )
          }
        } else if (squadId) {
          if (activityDomain.squadId !== squadId) {
            throw new BadRequestException(
              'Activity domain must belong to the same squad as the project'
            )
          }
        } else {
          // Project has no parent - area must also have no parent
          const activityDomainHasParent = !!(
            activityDomain.orgId ||
            activityDomain.deptId ||
            activityDomain.teamId ||
            activityDomain.squadId
          )
          if (activityDomainHasParent) {
            throw new BadRequestException(
              'Activity domain must have no parent when project has no parent'
            )
          }
        }
      }
    }

    // Validate single parent if being updated
    const orgId = updateProjectDto.orgId ?? project.orgId
    const deptId = updateProjectDto.deptId ?? project.deptId
    const teamId = updateProjectDto.teamId ?? project.teamId
    const squadId = updateProjectDto.squadId ?? project.squadId

    const parentCount = [orgId, deptId, teamId, squadId].filter(
      (id) => id !== undefined && id !== null
    ).length

    if (parentCount > 1) {
      throw new BadRequestException(
        'Project can have only one parent (organization, department, team, or squad)'
      )
    }

    Object.assign(project, updateProjectDto)
    const updatedProject = await this.projectRepository.save(project)

    return {
      projectId: updatedProject.projectId,
      projectName: updatedProject.projectName,
      projectDescription: updatedProject.projectDescription,
      projectStartDate: updatedProject.projectStartDate,
      projectEndDate: updatedProject.projectEndDate,
      projectStatus: updatedProject.projectStatus,
      projectDeadline: updatedProject.projectDeadline,
      projectGoals: updatedProject.projectGoals,
      orgId: updatedProject.orgId,
      deptId: updatedProject.deptId,
      teamId: updatedProject.teamId,
      squadId: updatedProject.squadId,
      activityDomainId: updatedProject.activityDomainId,
      projectActive: updatedProject.projectActive,
      userRole: member.role
    }
  }

  async delete(projectId: number, currentUser: ValidateUser): Promise<void> {
    // Check if user has delete permission
    const member = await this.projectMemberRepository.findOne({
      where: {
        projectId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (!member || !member.role.includes(powers.editAndDelete)) {
      throw new BadRequestException(
        'User does not have permission to delete this project'
      )
    }

    const project = await this.projectRepository.findOne({
      where: { projectId, projectActive: true }
    })

    if (!project) {
      throw new NotFoundException('Project not found')
    }

    // Soft delete
    project.projectActive = false
    await this.projectRepository.save(project)
  }
}
