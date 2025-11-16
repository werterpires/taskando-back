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
import { ProductMember } from '../products/entities/product-member.entity'
import { ProjectMember } from '../projects/entities/project-member.entity'
import { ActivityDomain } from '../activity-domains/entities/activity-domain.entity'
import { Product } from '../products/entities/product.entity'
import { Stream } from '../streams/entities/stream.entity'
import { Project } from '../projects/entities/project.entity'
import { ValidateUser } from '../shared/auth/types'
import { Response } from '../shared/types/response.types'
import { Paginator } from '../shared/types/paginator.types'
import { CreateProcessDto } from './dto/create-process.dto'
import { UpdateProcessDto } from './dto/update-process.dto'
import { Process } from './entities/process.entity'
import { ProcessMember } from './entities/process-member.entity'
import { IProcess } from './types'
import { ProcessesHelper } from './processes.helper'

@Injectable()
export class ProcessesService {
  constructor(
    @InjectRepository(Process)
    private readonly processRepository: Repository<Process>,
    @InjectRepository(ProcessMember)
    private readonly processMemberRepository: Repository<ProcessMember>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepository: Repository<OrganizationMember>,
    @InjectRepository(DepartmentMember)
    private readonly departmentMemberRepository: Repository<DepartmentMember>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(SquadMember)
    private readonly squadMemberRepository: Repository<SquadMember>,
    @InjectRepository(ProductMember)
    private readonly productMemberRepository: Repository<ProductMember>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
    @InjectRepository(ActivityDomain)
    private readonly activityDomainRepository: Repository<ActivityDomain>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Stream)
    private readonly streamRepository: Repository<Stream>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly dataSource: DataSource,
    private readonly processesHelper: ProcessesHelper
  ) {}

  async create(
    createProcessDto: CreateProcessDto,
    currentUser: ValidateUser
  ): Promise<IProcess> {
    const {
      orgId,
      deptId,
      teamId,
      squadId,
      productId,
      projectId,
      streamId,
      activityDomainId
    } = createProcessDto

    // Validate single parent (not including activityDomain as parent)
    const parentCount = [
      orgId,
      deptId,
      teamId,
      squadId,
      productId,
      projectId,
      streamId
    ].filter((id) => id !== undefined && id !== null).length

    if (parentCount > 1) {
      throw new BadRequestException(
        'Process can have only one parent (organization, department, team, squad, product, project, or stream)'
      )
    }

    // If productId, projectId or streamId is provided, validate and get parent context
    let effectiveOrgId = orgId
    let effectiveDeptId = deptId
    let effectiveTeamId = teamId
    let effectiveSquadId = squadId

    if (productId) {
      const product = await this.productRepository.findOne({
        where: { productId, productActive: true },
        relations: ['stream', 'stream.project', 'project']
      })
      if (!product) {
        throw new NotFoundException('Product not found')
      }

      // Check permission on product
      const productMember = await this.productMemberRepository.findOne({
        where: {
          productId,
          userId: currentUser.userId,
          active: true
        }
      })
      if (!productMember || !productMember.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add processes to this product'
        )
      }

      // Get parent context from product's hierarchy
      if (product.streamId && product.stream) {
        const project =
          product.stream.project ||
          (await this.projectRepository.findOne({
            where: { projectId: product.stream.projectId }
          }))
        if (project) {
          effectiveOrgId = project.orgId
          effectiveDeptId = project.deptId
          effectiveTeamId = project.teamId
          effectiveSquadId = project.squadId
        }
      } else if (product.projectId) {
        const project =
          product.project ||
          (await this.projectRepository.findOne({
            where: { projectId: product.projectId }
          }))
        if (project) {
          effectiveOrgId = project.orgId
          effectiveDeptId = project.deptId
          effectiveTeamId = project.teamId
          effectiveSquadId = project.squadId
        }
      } else {
        effectiveOrgId = product.orgId
        effectiveDeptId = product.deptId
        effectiveTeamId = product.teamId
        effectiveSquadId = product.squadId
      }
    } else if (streamId) {
      const stream = await this.streamRepository.findOne({
        where: { streamId, streamActive: true },
        relations: ['project']
      })
      if (!stream) {
        throw new NotFoundException('Stream not found')
      }

      // Check permission on stream's project
      const projectMember = await this.projectMemberRepository.findOne({
        where: {
          projectId: stream.projectId,
          userId: currentUser.userId,
          active: true
        }
      })
      if (!projectMember || !projectMember.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add processes to this stream'
        )
      }

      // Get parent context from stream's project
      const project =
        stream.project ||
        (await this.projectRepository.findOne({
          where: { projectId: stream.projectId }
        }))
      if (project) {
        effectiveOrgId = project.orgId
        effectiveDeptId = project.deptId
        effectiveTeamId = project.teamId
        effectiveSquadId = project.squadId
      }
    } else if (projectId) {
      const project = await this.projectRepository.findOne({
        where: { projectId, projectActive: true }
      })
      if (!project) {
        throw new NotFoundException('Project not found')
      }

      // Check permission on project
      const projectMember = await this.projectMemberRepository.findOne({
        where: { projectId, userId: currentUser.userId, active: true }
      })
      if (!projectMember || !projectMember.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add processes to this project'
        )
      }

      effectiveOrgId = project.orgId
      effectiveDeptId = project.deptId
      effectiveTeamId = project.teamId
      effectiveSquadId = project.squadId
    } else if (orgId) {
      const orgMember = await this.organizationMemberRepository.findOne({
        where: { userId: currentUser.userId, orgId, active: true }
      })
      if (!orgMember || !orgMember.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add processes to this organization'
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
          'User does not have permission to add processes to this department'
        )
      }
    } else if (teamId) {
      const teamMember = await this.teamMemberRepository.findOne({
        where: { userId: currentUser.userId, teamId, active: true }
      })
      if (!teamMember || !teamMember.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add processes to this team'
        )
      }
    } else if (squadId) {
      const squadMember = await this.squadMemberRepository.findOne({
        where: { userId: currentUser.userId, squadId, active: true }
      })
      if (!squadMember || !squadMember.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add processes to this squad'
        )
      }
    }

    // Validate activityDomain if provided
    if (activityDomainId) {
      const activityDomain = await this.activityDomainRepository.findOne({
        where: {
          activityDomainId: activityDomainId,
          activityDomainActive: true
        }
      })

      if (!activityDomain) {
        throw new NotFoundException('Activity domain not found')
      }

      // Validate activityDomain belongs to same parent
      if (effectiveOrgId) {
        if (activityDomain.orgId !== effectiveOrgId) {
          throw new BadRequestException(
            'Activity domain must belong to the same organization as the process'
          )
        }
      } else if (effectiveDeptId) {
        if (activityDomain.deptId !== effectiveDeptId) {
          throw new BadRequestException(
            'Activity domain must belong to the same department as the process'
          )
        }
      } else if (effectiveTeamId) {
        if (activityDomain.teamId !== effectiveTeamId) {
          throw new BadRequestException(
            'Activity domain must belong to the same team as the process'
          )
        }
      } else if (effectiveSquadId) {
        if (activityDomain.squadId !== effectiveSquadId) {
          throw new BadRequestException(
            'Activity domain must belong to the same squad as the process'
          )
        }
      } else {
        // Process has no parent - activityDomain must also have no parent
        const activityDomainHasParent = !!(
          activityDomain.orgId ||
          activityDomain.deptId ||
          activityDomain.teamId ||
          activityDomain.squadId
        )
        if (activityDomainHasParent) {
          throw new BadRequestException(
            'Activity domain must have no parent when process has no parent'
          )
        }
      }
    }

    // Create the process with transaction
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const process = this.processRepository.create({
        ...createProcessDto,
        processActive: true
      })

      const savedProcess = await queryRunner.manager.save(process)

      // Add creator as member with full powers
      const processMember = this.processMemberRepository.create({
        userId: currentUser.userId,
        processId: savedProcess.processId,
        role: `${powers.view},${powers.editAndDelete},${powers.addChildren}`,
        active: true
      })

      await queryRunner.manager.save(processMember)

      await queryRunner.commitTransaction()

      return {
        processId: savedProcess.processId,
        processName: savedProcess.processName,
        processDescription: savedProcess.processDescription,
        processStartDate: savedProcess.processStartDate,
        processEndDate: savedProcess.processEndDate,
        processStatus: savedProcess.processStatus,
        processDeadline: savedProcess.processDeadline,
        productId: savedProcess.productId,
        projectId: savedProcess.projectId,
        streamId: savedProcess.streamId,
        orgId: savedProcess.orgId,
        deptId: savedProcess.deptId,
        teamId: savedProcess.teamId,
        squadId: savedProcess.squadId,
        activityDomainId: savedProcess.activityDomainId,
        processActive: savedProcess.processActive,
        userRole: processMember.role,
        createdAt: savedProcess.createdAt,
        updatedAt: savedProcess.updatedAt
      }
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  async getOne(
    processId: number,
    currentUser: ValidateUser
  ): Promise<IProcess> {
    const process = await this.processRepository
      .createQueryBuilder('process')
      .innerJoin(
        'process_members',
        'member',
        'member.process_id = process.processId AND member.user_id = :userId AND member.active = true',
        { userId: currentUser.userId }
      )
      .where('process.processId = :processId', { processId })
      .andWhere('process.processActive = true')
      .andWhere('member.role LIKE :viewPower', {
        viewPower: `%${powers.view}%`
      })
      .select(['process.*', 'member.role'])
      .getRawOne()

    if (!process) {
      throw new NotFoundException('Process not found or access denied')
    }

    const currentUserMember = await this.processMemberRepository.findOne({
      where: {
        processId: process.processId,
        userId: currentUser.userId,
        active: true
      }
    })

    return {
      processId: process.processId,
      processName: process.processName,
      processDescription: process.processDescription,
      processStartDate: process.processStartDate,
      processEndDate: process.processEndDate,
      processStatus: process.processStatus,
      processDeadline: process.processDeadline,
      productId: process.productId,
      projectId: process.projectId,
      streamId: process.streamId,
      orgId: process.orgId,
      deptId: process.deptId,
      teamId: process.teamId,
      squadId: process.squadId,
      activityDomainId: process.activityDomainId,
      processActive: process.processActive,
      userRole: currentUserMember?.role || '',
      createdAt: process.createdAt,
      updatedAt: process.updatedAt
    }
  }

  async getAll(
    paginator: Paginator<Process>,
    currentUser: ValidateUser
  ): Promise<Response<Process, IProcess>> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'processName',
      direction = 'ASC',
      filters = []
    } = paginator

    const queryBuilder = this.processRepository
      .createQueryBuilder('process')
      .innerJoin(
        'process_members',
        'member',
        'member.process_id = process.processId AND member.user_id = :userId AND member.active = true',
        { userId: currentUser.userId }
      )
      .where('process.processActive = true')
      .andWhere('member.role LIKE :viewPower', {
        viewPower: `%${powers.view}%`
      })

    // Apply filters
    filters.forEach((filter) => {
      if (filter.value !== undefined && filter.value !== null) {
        queryBuilder.andWhere(`process.${filter.field} = :${filter.field}`, {
          [filter.field]: filter.value
        })
      }
    })

    const processes = await queryBuilder
      .orderBy(`process.${orderBy}`, direction)
      .skip(offset)
      .take(limit)
      .select(['process.*', 'member.role'])
      .getRawMany()

    const processesWithUserRoles = processes.map((process) => ({
      processId: process.processId,
      processName: process.processName,
      processDescription: process.processDescription,
      processStartDate: process.processStartDate,
      processEndDate: process.processEndDate,
      processStatus: process.processStatus,
      processDeadline: process.processDeadline,
      productId: process.productId,
      projectId: process.projectId,
      streamId: process.streamId,
      orgId: process.orgId,
      deptId: process.deptId,
      teamId: process.teamId,
      squadId: process.squadId,
      activityDomainId: process.activityDomainId,
      processActive: process.processActive,
      userRole: process.role,
      createdAt: process.createdAt,
      updatedAt: process.updatedAt
    }))

    return {
      paginator: paginator,
      itens: processesWithUserRoles
    }
  }

  async update(
    updateProcessDto: UpdateProcessDto,
    currentUser: ValidateUser
  ): Promise<IProcess> {
    const { processId, activityDomainId } = updateProcessDto

    // Check if user has edit permission
    const member = await this.processMemberRepository.findOne({
      where: {
        processId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (!member || !member.role.includes(powers.editAndDelete)) {
      throw new BadRequestException(
        'User does not have permission to edit this process'
      )
    }

    const process = await this.processRepository.findOne({
      where: { processId, processActive: true }
    })

    if (!process) {
      throw new NotFoundException('Process not found')
    }

    // Validate activityDomain if being updated
    if (activityDomainId !== undefined) {
      if (activityDomainId === null) {
        process.activityDomainId = undefined
      } else {
        const activityDomain = await this.activityDomainRepository.findOne({
          where: {
            activityDomainId: activityDomainId,
            activityDomainActive: true
          }
        })

        if (!activityDomain) {
          throw new NotFoundException('Activity domain not found')
        }

        // Get the parent from DTO or existing process
        const orgId = updateProcessDto.orgId ?? process.orgId
        const deptId = updateProcessDto.deptId ?? process.deptId
        const teamId = updateProcessDto.teamId ?? process.teamId
        const squadId = updateProcessDto.squadId ?? process.squadId
        const productId = updateProcessDto.productId ?? process.productId
        const projectId = updateProcessDto.projectId ?? process.projectId
        const streamId = updateProcessDto.streamId ?? process.streamId

        // Determine effective parent
        let effectiveOrgId = orgId
        let effectiveDeptId = deptId
        let effectiveTeamId = teamId
        let effectiveSquadId = squadId

        if (productId) {
          const product = await this.productRepository.findOne({
            where: { productId },
            relations: ['stream', 'stream.project', 'project']
          })
          if (product) {
            if (product.streamId && product.stream) {
              const proj =
                product.stream.project ||
                (await this.projectRepository.findOne({
                  where: { projectId: product.stream.projectId }
                }))
              if (proj) {
                effectiveOrgId = proj.orgId
                effectiveDeptId = proj.deptId
                effectiveTeamId = proj.teamId
                effectiveSquadId = proj.squadId
              }
            } else if (product.projectId) {
              const proj =
                product.project ||
                (await this.projectRepository.findOne({
                  where: { projectId: product.projectId }
                }))
              if (proj) {
                effectiveOrgId = proj.orgId
                effectiveDeptId = proj.deptId
                effectiveTeamId = proj.teamId
                effectiveSquadId = proj.squadId
              }
            } else {
              effectiveOrgId = product.orgId
              effectiveDeptId = product.deptId
              effectiveTeamId = product.teamId
              effectiveSquadId = product.squadId
            }
          }
        } else if (streamId) {
          const stream = await this.streamRepository.findOne({
            where: { streamId },
            relations: ['project']
          })
          if (stream?.project) {
            effectiveOrgId = stream.project.orgId
            effectiveDeptId = stream.project.deptId
            effectiveTeamId = stream.project.teamId
            effectiveSquadId = stream.project.squadId
          }
        } else if (projectId) {
          const proj = await this.projectRepository.findOne({
            where: { projectId }
          })
          if (proj) {
            effectiveOrgId = proj.orgId
            effectiveDeptId = proj.deptId
            effectiveTeamId = proj.teamId
            effectiveSquadId = proj.squadId
          }
        }

        // Validate activityDomain belongs to same parent
        if (effectiveOrgId) {
          if (activityDomain.orgId !== effectiveOrgId) {
            throw new BadRequestException(
              'Activity domain must belong to the same organization as the process'
            )
          }
        } else if (effectiveDeptId) {
          if (activityDomain.deptId !== effectiveDeptId) {
            throw new BadRequestException(
              'Activity domain must belong to the same department as the process'
            )
          }
        } else if (effectiveTeamId) {
          if (activityDomain.teamId !== effectiveTeamId) {
            throw new BadRequestException(
              'Activity domain must belong to the same team as the process'
            )
          }
        } else if (effectiveSquadId) {
          if (activityDomain.squadId !== effectiveSquadId) {
            throw new BadRequestException(
              'Activity domain must belong to the same squad as the process'
            )
          }
        } else {
          const activityDomainHasParent = !!(
            activityDomain.orgId ||
            activityDomain.deptId ||
            activityDomain.teamId ||
            activityDomain.squadId
          )
          if (activityDomainHasParent) {
            throw new BadRequestException(
              'Activity domain must have no parent when process has no parent'
            )
          }
        }
      }
    }

    // Validate single parent if being updated
    const orgId = updateProcessDto.orgId ?? process.orgId
    const deptId = updateProcessDto.deptId ?? process.deptId
    const teamId = updateProcessDto.teamId ?? process.teamId
    const squadId = updateProcessDto.squadId ?? process.squadId
    const productId = updateProcessDto.productId ?? process.productId
    const projectId = updateProcessDto.projectId ?? process.projectId
    const streamId = updateProcessDto.streamId ?? process.streamId

    const parentCount = [
      orgId,
      deptId,
      teamId,
      squadId,
      productId,
      projectId,
      streamId
    ].filter((id) => id !== undefined && id !== null).length

    if (parentCount > 1) {
      throw new BadRequestException(
        'Process can have only one parent (organization, department, team, squad, product, project, or stream)'
      )
    }

    Object.assign(process, updateProcessDto)
    const updatedProcess = await this.processRepository.save(process)

    return {
      processId: updatedProcess.processId,
      processName: updatedProcess.processName,
      processDescription: updatedProcess.processDescription,
      processStartDate: updatedProcess.processStartDate,
      processEndDate: updatedProcess.processEndDate,
      processStatus: updatedProcess.processStatus,
      processDeadline: updatedProcess.processDeadline,
      productId: updatedProcess.productId,
      projectId: updatedProcess.projectId,
      streamId: updatedProcess.streamId,
      orgId: updatedProcess.orgId,
      deptId: updatedProcess.deptId,
      teamId: updatedProcess.teamId,
      squadId: updatedProcess.squadId,
      activityDomainId: updatedProcess.activityDomainId,
      processActive: updatedProcess.processActive,
      userRole: member.role,
      createdAt: updatedProcess.createdAt,
      updatedAt: updatedProcess.updatedAt
    }
  }

  async delete(processId: number, currentUser: ValidateUser): Promise<void> {
    const member = await this.processMemberRepository.findOne({
      where: {
        processId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (!member || !member.role.includes(powers.editAndDelete)) {
      throw new BadRequestException(
        'User does not have permission to delete this process'
      )
    }

    const process = await this.processRepository.findOne({
      where: { processId, processActive: true }
    })

    if (!process) {
      throw new NotFoundException('Process not found')
    }

    // Soft delete
    process.processActive = false
    await this.processRepository.save(process)
  }
}
