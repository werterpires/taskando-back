import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { powers } from '../constants/roles.enum'
import { ValidateUser } from '../shared/auth/types'
import { Response } from '../shared/types/response.types'
import { Paginator } from '../shared/types/paginator.types'
import { Stream } from './entities/stream.entity'
import { CreateStreamDto } from './dto/create-stream.dto'
import { UpdateStreamDto } from './dto/update-stream.dto'
import { IStream } from './types'
import { StreamsHelper } from './streams.helper'
import { Project } from '../projects/entities/project.entity'
import { ActivityDomain } from '../activity-domains/entities/activity-domain.entity'
import { ProjectMember } from '../projects/entities/project-member.entity'

@Injectable()
export class StreamsService {
  constructor(
    @InjectRepository(Stream)
    private readonly streamRepository: Repository<Stream>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ActivityDomain)
    private readonly activityDomainRepository: Repository<ActivityDomain>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
    private readonly dataSource: DataSource,
    private readonly streamsHelper: StreamsHelper
  ) {}

  async create(
    createStreamDto: CreateStreamDto,
    currentUser: ValidateUser
  ): Promise<IStream> {
    const { projectId, activityDomainId } = createStreamDto

    // Load project and ensure it's active
    const project = await this.projectRepository.findOne({
      where: { projectId, projectActive: true }
    })
    if (!project) {
      throw new NotFoundException('Project not found')
    }

    // Check membership & addChildren power on project
    const projectMember = await this.projectMemberRepository.findOne({
      where: { projectId, userId: currentUser.userId, active: true }
    })
    if (!projectMember || !projectMember.role.includes(powers.addChildren)) {
      throw new BadRequestException(
        'User does not have permission to add streams to this project'
      )
    }

    // Validate activityDomain linkage if provided
    if (activityDomainId) {
      const activityDomain = await this.activityDomainRepository.findOne({
        where: { areaId: activityDomainId, activityDomainActive: true }
      })
      if (!activityDomain) {
        throw new NotFoundException('Activity domain not found')
      }

      // Determine project parent context
      const { orgId, deptId, teamId, squadId } = project

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
        // Project has no parent - activityDomain must also have no parent
        const hasParent = !!(
          activityDomain.orgId ||
          activityDomain.deptId ||
          activityDomain.teamId ||
          activityDomain.squadId
        )
        if (hasParent) {
          throw new BadRequestException(
            'Activity domain must have no parent when project has no parent'
          )
        }
      }
    }

    const stream = this.streamRepository.create({
      ...createStreamDto,
      streamActive: true
    })
    const saved = await this.streamRepository.save(stream)

    return {
      streamId: saved.streamId,
      streamName: saved.streamName,
      streamDescription: saved.streamDescription,
      streamGoals: saved.streamGoals,
      projectId: saved.projectId,
      activityDomainId: saved.activityDomainId,
      streamActive: saved.streamActive,
      created_at: saved.createdAt,
      updated_at: saved.updatedAt
    }
  }

  async getOne(streamId: number, currentUser: ValidateUser): Promise<IStream> {
    const stream = await this.streamRepository
      .createQueryBuilder('stream')
      .innerJoin(
        'project_members',
        'member',
        'member.project_id = stream.project_id AND member.user_id = :userId AND member.active = true',
        { userId: currentUser.userId }
      )
      .where('stream.streamId = :streamId', { streamId })
      .andWhere('stream.streamActive = true')
      .andWhere('member.role LIKE :viewPower', {
        viewPower: `%${powers.view}%`
      })
      .select(['stream.*'])
      .getRawOne()

    if (!stream) {
      throw new NotFoundException('Stream not found or access denied')
    }

    return {
      streamId: stream.streamId,
      streamName: stream.streamName,
      streamDescription: stream.streamDescription,
      streamGoals: stream.streamGoals,
      projectId: stream.projectId,
      activityDomainId: stream.activityDomainId,
      streamActive: stream.streamActive,
      created_at: stream.createdAt,
      updated_at: stream.updatedAt
    }
  }

  async getAll(
    paginator: Paginator<Stream>,
    currentUser: ValidateUser
  ): Promise<Response<Stream, IStream>> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'streamName',
      direction = 'ASC',
      filters = []
    } = paginator

    const qb = this.streamRepository
      .createQueryBuilder('stream')
      .innerJoin(
        'project_members',
        'member',
        'member.project_id = stream.project_id AND member.user_id = :userId AND member.active = true',
        { userId: currentUser.userId }
      )
      .where('stream.streamActive = true')
      .andWhere('member.role LIKE :viewPower', {
        viewPower: `%${powers.view}%`
      })

    filters.forEach((filter) => {
      if (filter.value !== undefined && filter.value !== null) {
        qb.andWhere(
          `stream.${String(filter.field)} = :${String(filter.field)}`,
          {
            [String(filter.field)]: filter.value
          }
        )
      }
    })

    const streams = await qb
      .orderBy(`stream.${String(orderBy)}`, direction)
      .skip(offset)
      .take(limit)
      .select(['stream.*'])
      .getRawMany()

    const items: IStream[] = streams.map((s) => ({
      streamId: s.streamId,
      streamName: s.streamName,
      streamDescription: s.streamDescription,
      streamGoals: s.streamGoals,
      projectId: s.projectId,
      activityDomainId: s.activityDomainId,
      streamActive: s.streamActive,
      created_at: s.createdAt,
      updated_at: s.updatedAt
    }))

    return { paginator, itens: items }
  }

  async getAllByProjectId(
    projectId: number,
    paginator: Paginator<Stream>,
    currentUser: ValidateUser
  ): Promise<Response<Stream, IStream>> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'streamName',
      direction = 'ASC'
    } = paginator

    // Validate membership with view power
    const member = await this.projectMemberRepository.findOne({
      where: { projectId, userId: currentUser.userId, active: true }
    })
    if (!member || !member.role.includes(powers.view)) {
      throw new BadRequestException(
        'User does not have permission to view streams of this project'
      )
    }

    const qb = this.streamRepository
      .createQueryBuilder('stream')
      .where('stream.projectId = :projectId', { projectId })
      .andWhere('stream.streamActive = true')

    const streams = await qb
      .orderBy(`stream.${String(orderBy)}`, direction)
      .skip(offset)
      .take(limit)
      .getMany()

    const itens: IStream[] = streams.map((s) => ({
      streamId: s.streamId,
      streamName: s.streamName,
      streamDescription: s.streamDescription,
      streamGoals: s.streamGoals,
      projectId: s.projectId,
      activityDomainId: s.activityDomainId,
      streamActive: s.streamActive,
      created_at: s.createdAt,
      updated_at: s.updatedAt
    }))

    const paginatory: Paginator<Stream> = {
      limit,
      offset,
      orderBy,
      direction,
      filters: [],
      totalItems: itens.length
    }

    return { paginator: paginatory, itens }
  }

  async getAllByActivityDomainId(
    activityDomainId: number,
    paginator: Paginator<Stream>,
    currentUser: ValidateUser
  ): Promise<Response<Stream, IStream>> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'streamName',
      direction = 'ASC'
    } = paginator

    // Streams visible only if user is member of their projects with view power
    const qb = this.streamRepository
      .createQueryBuilder('stream')
      .innerJoin(
        'project_members',
        'member',
        'member.project_id = stream.project_id AND member.user_id = :userId AND member.active = true',
        { userId: currentUser.userId }
      )
      .where('stream.activityDomainId = :activityDomainId', {
        activityDomainId
      })
      .andWhere('stream.streamActive = true')
      .andWhere('member.role LIKE :viewPower', {
        viewPower: `%${powers.view}%`
      })

    const streams = await qb
      .orderBy(`stream.${String(orderBy)}`, direction)
      .skip(offset)
      .take(limit)
      .select(['stream.*'])
      .getRawMany()

    const itens: IStream[] = streams.map((s) => ({
      streamId: s.streamId,
      streamName: s.streamName,
      streamDescription: s.streamDescription,
      streamGoals: s.streamGoals,
      projectId: s.projectId,
      activityDomainId: s.activityDomainId,
      streamActive: s.streamActive,
      created_at: s.createdAt,
      updated_at: s.updatedAt
    }))

    const paginatory: Paginator<Stream> = {
      limit,
      offset,
      orderBy,
      direction,
      filters: [],
      totalItems: itens.length
    }

    return { paginator: paginatory, itens }
  }

  async update(
    updateStreamDto: UpdateStreamDto,
    currentUser: ValidateUser
  ): Promise<IStream> {
    const { streamId, activityDomainId } = updateStreamDto

    const stream = await this.streamRepository.findOne({
      where: { streamId, streamActive: true }
    })
    if (!stream) {
      throw new NotFoundException('Stream not found')
    }

    // Check edit permission via project membership
    const member = await this.projectMemberRepository.findOne({
      where: {
        projectId: stream.projectId,
        userId: currentUser.userId,
        active: true
      }
    })
    if (!member || !member.role.includes(powers.editAndDelete)) {
      throw new BadRequestException(
        'User does not have permission to edit this stream'
      )
    }

    // If updating activityDomain linkage
    if (activityDomainId !== undefined) {
      if (activityDomainId === null) {
        stream.activityDomainId = undefined
      } else {
        const activityDomain = await this.activityDomainRepository.findOne({
          where: { areaId: activityDomainId, activityDomainActive: true }
        })
        if (!activityDomain) {
          throw new NotFoundException('Activity domain not found')
        }

        // Get parent context from associated project
        const project = await this.projectRepository.findOne({
          where: { projectId: stream.projectId, projectActive: true }
        })
        if (!project) {
          throw new NotFoundException('Associated project not found')
        }
        const { orgId, deptId, teamId, squadId } = project

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
          const hasParent = !!(
            activityDomain.orgId ||
            activityDomain.deptId ||
            activityDomain.teamId ||
            activityDomain.squadId
          )
          if (hasParent) {
            throw new BadRequestException(
              'Activity domain must have no parent when project has no parent'
            )
          }
        }
        stream.activityDomainId = activityDomainId
      }
    }

    Object.assign(stream, updateStreamDto)
    const updated = await this.streamRepository.save(stream)

    return {
      streamId: updated.streamId,
      streamName: updated.streamName,
      streamDescription: updated.streamDescription,
      streamGoals: updated.streamGoals,
      projectId: updated.projectId,
      activityDomainId: updated.activityDomainId,
      streamActive: updated.streamActive,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt
    }
  }

  async delete(streamId: number, currentUser: ValidateUser): Promise<void> {
    const stream = await this.streamRepository.findOne({
      where: { streamId, streamActive: true }
    })
    if (!stream) {
      throw new NotFoundException('Stream not found')
    }

    const member = await this.projectMemberRepository.findOne({
      where: {
        projectId: stream.projectId,
        userId: currentUser.userId,
        active: true
      }
    })
    if (!member || !member.role.includes(powers.editAndDelete)) {
      throw new BadRequestException(
        'User does not have permission to delete this stream'
      )
    }

    stream.streamActive = false
    await this.streamRepository.save(stream)
  }
}
