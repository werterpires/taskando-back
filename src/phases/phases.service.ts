import {
  Injectable,
  NotFoundException,
  BadRequestException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { powers } from '../constants/roles.enum'
import { ProcessMember } from '../processes/entities/process-member.entity'
import { Process } from '../processes/entities/process.entity'
import { ValidateUser } from '../shared/auth/types'
import { Response } from '../shared/types/response.types'
import { Paginator } from '../shared/types/paginator.types'
import { CreatePhaseDto } from './dto/create-phase.dto'
import { UpdatePhaseDto } from './dto/update-phase.dto'
import { Phase } from './entities/phase.entity'
import { PhaseMember } from './entities/phase-member.entity'
import { IPhase } from './types'
import { PhasesHelper } from './phases.helper'

@Injectable()
export class PhasesService {
  constructor(
    @InjectRepository(Phase)
    private readonly phaseRepository: Repository<Phase>,
    @InjectRepository(PhaseMember)
    private readonly phaseMemberRepository: Repository<PhaseMember>,
    @InjectRepository(ProcessMember)
    private readonly processMemberRepository: Repository<ProcessMember>,
    @InjectRepository(Process)
    private readonly processRepository: Repository<Process>,
    private readonly dataSource: DataSource,
    private readonly phasesHelper: PhasesHelper
  ) {}

  async create(
    createPhaseDto: CreatePhaseDto,
    currentUser: ValidateUser
  ): Promise<IPhase> {
    const { processId } = createPhaseDto

    // Validate process exists
    const process = await this.processRepository.findOne({
      where: { processId, processActive: true }
    })

    if (!process) {
      throw new NotFoundException('Process not found')
    }

    // Check permission on process
    const processMember = await this.processMemberRepository.findOne({
      where: {
        processId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (!processMember || !processMember.role.includes(powers.addChildren)) {
      throw new BadRequestException(
        'User does not have permission to add phases to this process'
      )
    }

    // Create the phase with transaction
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const phase = this.phaseRepository.create({
        ...createPhaseDto,
        dependencyThread: '|',
        phaseActive: true
      })

      const savedPhase = await queryRunner.manager.save(phase)

      // Add creator as member with full powers
      const phaseMember = this.phaseMemberRepository.create({
        userId: currentUser.userId,
        phaseId: savedPhase.phaseId,
        role: `${powers.view},${powers.editAndDelete},${powers.addChildren}`,
        active: true
      })

      await queryRunner.manager.save(phaseMember)

      await queryRunner.commitTransaction()

      return {
        phaseId: savedPhase.phaseId,
        phaseName: savedPhase.phaseName,
        phaseDescription: savedPhase.phaseDescription,
        phaseStartDate: savedPhase.phaseStartDate,
        phaseEndDate: savedPhase.phaseEndDate,
        phaseDeadline: savedPhase.phaseDeadline,
        processId: savedPhase.processId,
        phaseActive: savedPhase.phaseActive,
        userRole: phaseMember.role,
        createdAt: savedPhase.createdAt,
        updatedAt: savedPhase.updatedAt
      }
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  async getOne(phaseId: number, currentUser: ValidateUser): Promise<IPhase> {
    const phase = await this.phaseRepository
      .createQueryBuilder('phase')
      .innerJoin(
        'phase_members',
        'member',
        'member.phase_id = phase.phaseId AND member.user_id = :userId AND member.active = true',
        { userId: currentUser.userId }
      )
      .where('phase.phaseId = :phaseId', { phaseId })
      .andWhere('phase.phaseActive = true')
      .andWhere('member.role LIKE :viewPower', {
        viewPower: `%${powers.view}%`
      })
      .select(['phase.*', 'member.role'])
      .getRawOne()

    if (!phase) {
      throw new NotFoundException('Phase not found or access denied')
    }

    const currentUserMember = await this.phaseMemberRepository.findOne({
      where: {
        phaseId: phase.phaseId,
        userId: currentUser.userId,
        active: true
      }
    })

    return {
      phaseId: phase.phaseId,
      phaseName: phase.phaseName,
      phaseDescription: phase.phaseDescription,
      phaseStartDate: phase.phaseStartDate,
      phaseEndDate: phase.phaseEndDate,
      phaseDeadline: phase.phaseDeadline,
      processId: phase.processId,
      phaseActive: phase.phaseActive,
      userRole: currentUserMember?.role || '',
      createdAt: phase.createdAt,
      updatedAt: phase.updatedAt
    }
  }

  async getAll(
    paginator: Paginator<Phase>,
    currentUser: ValidateUser
  ): Promise<Response<Phase, IPhase>> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'phaseName',
      direction = 'ASC',
      filters = []
    } = paginator

    const queryBuilder = this.phaseRepository
      .createQueryBuilder('phase')
      .innerJoin(
        'phase_members',
        'member',
        'member.phase_id = phase.phaseId AND member.user_id = :userId AND member.active = true',
        { userId: currentUser.userId }
      )
      .where('phase.phaseActive = true')
      .andWhere('member.role LIKE :viewPower', {
        viewPower: `%${powers.view}%`
      })

    // Apply filters
    filters.forEach((filter) => {
      if (filter.value !== undefined && filter.value !== null) {
        queryBuilder.andWhere(`phase.${filter.field} = :${filter.field}`, {
          [filter.field]: filter.value
        })
      }
    })

    const phases = await queryBuilder
      .orderBy(`phase.${orderBy}`, direction)
      .skip(offset)
      .take(limit)
      .select(['phase.*', 'member.role'])
      .getRawMany()

    const phasesWithUserRoles = phases.map((phase) => ({
      phaseId: phase.phaseId,
      phaseName: phase.phaseName,
      phaseDescription: phase.phaseDescription,
      phaseStartDate: phase.phaseStartDate,
      phaseEndDate: phase.phaseEndDate,
      phaseDeadline: phase.phaseDeadline,
      processId: phase.processId,
      phaseActive: phase.phaseActive,
      userRole: phase.role,
      createdAt: phase.createdAt,
      updatedAt: phase.updatedAt
    }))

    return {
      paginator: paginator,
      itens: phasesWithUserRoles
    }
  }

  async update(
    updatePhaseDto: UpdatePhaseDto,
    currentUser: ValidateUser
  ): Promise<IPhase> {
    const { phaseId, processId } = updatePhaseDto

    // Check if user has edit permission
    const member = await this.phaseMemberRepository.findOne({
      where: {
        phaseId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (!member || !member.role.includes(powers.editAndDelete)) {
      throw new BadRequestException(
        'User does not have permission to edit this phase'
      )
    }

    const phase = await this.phaseRepository.findOne({
      where: { phaseId, phaseActive: true }
    })

    if (!phase) {
      throw new NotFoundException('Phase not found')
    }

    // If processId is being updated, validate new process
    if (processId !== undefined && processId !== phase.processId) {
      const process = await this.processRepository.findOne({
        where: { processId, processActive: true }
      })

      if (!process) {
        throw new NotFoundException('Process not found')
      }

      // Check permission on new process
      const processMember = await this.processMemberRepository.findOne({
        where: {
          processId,
          userId: currentUser.userId,
          active: true
        }
      })

      if (!processMember || !processMember.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to move phase to this process'
        )
      }
    }

    Object.assign(phase, updatePhaseDto)
    const updatedPhase = await this.phaseRepository.save(phase)

    return {
      phaseId: updatedPhase.phaseId,
      phaseName: updatedPhase.phaseName,
      phaseDescription: updatedPhase.phaseDescription,
      phaseStartDate: updatedPhase.phaseStartDate,
      phaseEndDate: updatedPhase.phaseEndDate,
      phaseDeadline: updatedPhase.phaseDeadline,
      processId: updatedPhase.processId,
      phaseActive: updatedPhase.phaseActive,
      userRole: member.role,
      createdAt: updatedPhase.createdAt,
      updatedAt: updatedPhase.updatedAt
    }
  }

  async delete(phaseId: number, currentUser: ValidateUser): Promise<void> {
    const member = await this.phaseMemberRepository.findOne({
      where: {
        phaseId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (!member || !member.role.includes(powers.editAndDelete)) {
      throw new BadRequestException(
        'User does not have permission to delete this phase'
      )
    }

    const phase = await this.phaseRepository.findOne({
      where: { phaseId, phaseActive: true }
    })

    if (!phase) {
      throw new NotFoundException('Phase not found')
    }

    // Soft delete
    phase.phaseActive = false
    await this.phaseRepository.save(phase)
  }
}
