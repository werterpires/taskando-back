import {
  Injectable,
  NotFoundException,
  BadRequestException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository, In } from 'typeorm'
import { powers } from '../constants/roles.enum'
import { OrganizationMember } from '../organizations-members/entities/organization-member.entity'
import { DepartmentMember } from '../departments/entities/department-member.entity'
import { TeamMember } from '../teams/entities/team-member.entity'
import { SquadMember } from '../squads/entities/squad-member.entity'
import { ProjectMember } from '../projects/entities/project-member.entity'
import { ProductMember } from '../products/entities/product-member.entity'
import { ProcessMember } from '../processes/entities/process-member.entity'
import { ActivityDomain } from '../activity-domains/entities/activity-domain.entity'
import { Stream } from '../streams/entities/stream.entity'
import { Product } from '../products/entities/product.entity'
import { Process } from '../processes/entities/process.entity'
import { Phase } from '../phases/entities/phase.entity'
import { ValidateUser } from '../shared/auth/types'
import { CreateCycleDto } from './dto/create-cycle.dto'
import { UpdateCycleDto } from './dto/update-cycle.dto'
import { DeleteCycleDto } from './dto/delete-cycle.dto'
import { Cycle } from './entities/cycle.entity'
import { CycleParameter } from './entities/cycle-parameter.entity'
import { CycleMember } from './entities/cycle-member.entity'
import { ICycle } from './types'
import { CyclesHelper } from './cycles.helper'

@Injectable()
export class CyclesService {
  constructor(
    @InjectRepository(Cycle)
    private readonly cycleRepository: Repository<Cycle>,
    @InjectRepository(CycleParameter)
    private readonly cycleParameterRepository: Repository<CycleParameter>,
    @InjectRepository(CycleMember)
    private readonly cycleMemberRepository: Repository<CycleMember>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepository: Repository<OrganizationMember>,
    @InjectRepository(DepartmentMember)
    private readonly departmentMemberRepository: Repository<DepartmentMember>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(SquadMember)
    private readonly squadMemberRepository: Repository<SquadMember>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
    @InjectRepository(ProductMember)
    private readonly productMemberRepository: Repository<ProductMember>,
    @InjectRepository(Stream)
    private readonly streamRepository: Repository<Stream>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Process)
    private readonly processRepository: Repository<Process>,
    @InjectRepository(Phase)
    private readonly phaseRepository: Repository<Phase>,
    @InjectRepository(ProcessMember)
    private readonly processMemberRepository: Repository<ProcessMember>,
    @InjectRepository(ActivityDomain)
    private readonly activityDomainRepository: Repository<ActivityDomain>,
    private readonly dataSource: DataSource,
    private readonly cyclesHelper: CyclesHelper
  ) {}

  async create(
    createCycleDto: CreateCycleDto,
    currentUser: ValidateUser
  ): Promise<ICycle> {
    const {
      orgId,
      deptId,
      teamId,
      squadId,
      projectId,
      streamId,
      productId,
      processId,
      phaseId,
      activityDomainId,
      parameters
    } = createCycleDto

    // Validate single parent
    const parentCount = [
      orgId,
      deptId,
      teamId,
      squadId,
      projectId,
      streamId,
      productId,
      processId,
      phaseId
    ].filter((id) => id !== undefined && id !== null).length

    if (parentCount > 1) {
      throw new BadRequestException('Cycle can have only one parent')
    }

    // Validate cycle type is GENERAL or APPOINTMENT
    if (
      createCycleDto.cycleType !== 'GENERAL' &&
      createCycleDto.cycleType !== 'APPOINTMENT'
    ) {
      throw new BadRequestException('Cycle type must be GENERAL or APPOINTMENT')
    }

    // Validate cycle type rules (same as tasks)
    this.validateCycleTypeRules(createCycleDto)

    // Validate parameters
    for (const param of createCycleDto.parameters) {
      this.cyclesHelper.validateParameterTimeValue(
        param.period,
        param.timeValue
      )
    }

    // Validate activityDomain if provided (same logic as tasks)
    if (activityDomainId) {
      await this.validateActivityDomain(
        activityDomainId,
        orgId,
        deptId,
        teamId,
        squadId
      )
    }

    // Validate create permission
    await this.validateCreatePermission(createCycleDto, currentUser)

    // Create cycle and parameters in transaction
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const cycle = this.cycleRepository.create({
        ...createCycleDto,
        cycleActive: true,
        parameters: undefined
      })

      const savedCycle = await queryRunner.manager.save(cycle)

      // Create parameters
      const cycleParameters = parameters.map((param) =>
        this.cycleParameterRepository.create({
          cycleId: savedCycle.cycleId,
          period: param.period,
          timeValue: param.timeValue
        })
      )
      const savedParameters = await queryRunner.manager.save(cycleParameters)

      // Add creator as member with full powers
      const cycleMember = this.cycleMemberRepository.create({
        userId: currentUser.userId,
        cycleId: savedCycle.cycleId,
        role: `${powers.view},${powers.editAndDelete},${powers.addChildren}`,
        active: true
      })

      await queryRunner.manager.save(cycleMember)

      await queryRunner.commitTransaction()

      return {
        cycleId: savedCycle.cycleId,
        cycleName: savedCycle.cycleName,
        cycleDescription: savedCycle.cycleDescription,
        cycleStartDate: savedCycle.cycleStartDate,
        cycleEndDate: savedCycle.cycleEndDate,
        cycleDeadline: savedCycle.cycleDeadline,
        cycleStatus: savedCycle.cycleStatus,
        cyclePriority: savedCycle.cyclePriority,
        size: savedCycle.size,
        cycleType: savedCycle.cycleType,
        cycleStartsAt: savedCycle.cycleStartsAt,
        duration: savedCycle.duration,
        cycleShowInCalendar: savedCycle.cycleShowInCalendar,
        orgId: savedCycle.orgId,
        deptId: savedCycle.deptId,
        teamId: savedCycle.teamId,
        squadId: savedCycle.squadId,
        projectId: savedCycle.projectId,
        streamId: savedCycle.streamId,
        productId: savedCycle.productId,
        processId: savedCycle.processId,
        phaseId: savedCycle.phaseId,
        activityDomainId: savedCycle.activityDomainId,
        cycleActive: savedCycle.cycleActive,
        parameters: savedParameters.map((p) => ({
          cycleParameterId: p.cycleParameterId,
          cycleId: p.cycleId,
          period: p.period,
          timeValue: p.timeValue
        })),
        userRole: cycleMember.role
      }
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  async getOne(cycleId: number, currentUser: ValidateUser): Promise<ICycle> {
    const cycle = await this.cycleRepository.findOne({
      where: { cycleId, cycleActive: true },
      relations: ['parameters']
    })

    if (!cycle) {
      throw new NotFoundException('Cycle not found')
    }

    const member = await this.cycleMemberRepository.findOne({
      where: {
        cycleId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (!member || !member.role.includes(powers.view)) {
      throw new BadRequestException(
        'User does not have permission to view this cycle'
      )
    }

    return {
      cycleId: cycle.cycleId,
      cycleName: cycle.cycleName,
      cycleDescription: cycle.cycleDescription,
      cycleStartDate: cycle.cycleStartDate,
      cycleEndDate: cycle.cycleEndDate,
      cycleDeadline: cycle.cycleDeadline,
      cycleStatus: cycle.cycleStatus,
      cyclePriority: cycle.cyclePriority,
      size: cycle.size,
      cycleType: cycle.cycleType,
      cycleStartsAt: cycle.cycleStartsAt,
      duration: cycle.duration,
      cycleShowInCalendar: cycle.cycleShowInCalendar,
      orgId: cycle.orgId,
      deptId: cycle.deptId,
      teamId: cycle.teamId,
      squadId: cycle.squadId,
      projectId: cycle.projectId,
      streamId: cycle.streamId,
      productId: cycle.productId,
      processId: cycle.processId,
      phaseId: cycle.phaseId,
      activityDomainId: cycle.activityDomainId,
      cycleActive: cycle.cycleActive,
      parameters: cycle.parameters.map((p) => ({
        cycleParameterId: p.cycleParameterId,
        cycleId: p.cycleId,
        period: p.period,
        timeValue: p.timeValue
      })),
      userRole: member.role
    }
  }

  async update(
    updateCycleDto: UpdateCycleDto,
    currentUser: ValidateUser
  ): Promise<ICycle> {
    const { cycleId, parameters, parametersToDelete } = updateCycleDto

    const cycle = await this.cycleRepository.findOne({
      where: { cycleId, cycleActive: true },
      relations: ['parameters']
    })

    if (!cycle) {
      throw new NotFoundException('Cycle not found')
    }

    const member = await this.cycleMemberRepository.findOne({
      where: { cycleId, userId: currentUser.userId, active: true }
    })

    if (!member || !member.role.includes(powers.editAndDelete)) {
      throw new BadRequestException(
        'User does not have permission to edit this cycle'
      )
    }

    // Validate cycle type if being updated
    if (updateCycleDto.cycleType) {
      if (
        updateCycleDto.cycleType !== 'GENERAL' &&
        updateCycleDto.cycleType !== 'APPOINTMENT'
      ) {
        throw new BadRequestException(
          'Cycle type must be GENERAL or APPOINTMENT'
        )
      }

      const cycleToValidate = {
        ...cycle,
        ...updateCycleDto
      }
      this.validateCycleTypeRules(cycleToValidate)
    }

    // Validate new parameters
    if (parameters) {
      parameters.forEach((param) => {
        this.cyclesHelper.validateParameterTimeValue(
          param.period,
          param.timeValue
        )
      })
    }

    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      // Update cycle basic fields
      Object.assign(cycle, {
        ...updateCycleDto,
        parameters: undefined,
        parametersToDelete: undefined
      })
      await queryRunner.manager.save(cycle)

      // Delete parameters if requested
      if (parametersToDelete && parametersToDelete.length > 0) {
        await queryRunner.manager.delete(CycleParameter, {
          cycleParameterId: In(parametersToDelete),
          cycleId
        })
      }

      // Add or update parameters
      if (parameters) {
        for (const param of parameters) {
          if (param.cycleParameterId) {
            // Update existing
            await queryRunner.manager.update(
              CycleParameter,
              { cycleParameterId: param.cycleParameterId, cycleId },
              { period: param.period, timeValue: param.timeValue }
            )
          } else {
            // Create new
            const newParam = this.cycleParameterRepository.create({
              cycleId,
              period: param.period,
              timeValue: param.timeValue
            })
            await queryRunner.manager.save(newParam)
          }
        }
      }

      await queryRunner.commitTransaction()

      // Reload with parameters
      const reloadedCycle = await this.cycleRepository.findOne({
        where: { cycleId },
        relations: ['parameters']
      })

      return {
        cycleId: reloadedCycle!.cycleId,
        cycleName: reloadedCycle!.cycleName,
        cycleDescription: reloadedCycle!.cycleDescription,
        cycleStartDate: reloadedCycle!.cycleStartDate,
        cycleEndDate: reloadedCycle!.cycleEndDate,
        cycleDeadline: reloadedCycle!.cycleDeadline,
        cycleStatus: reloadedCycle!.cycleStatus,
        cyclePriority: reloadedCycle!.cyclePriority,
        size: reloadedCycle!.size,
        cycleType: reloadedCycle!.cycleType,
        cycleStartsAt: reloadedCycle!.cycleStartsAt,
        duration: reloadedCycle!.duration,
        cycleShowInCalendar: reloadedCycle!.cycleShowInCalendar,
        orgId: reloadedCycle!.orgId,
        deptId: reloadedCycle!.deptId,
        teamId: reloadedCycle!.teamId,
        squadId: reloadedCycle!.squadId,
        projectId: reloadedCycle!.projectId,
        streamId: reloadedCycle!.streamId,
        productId: reloadedCycle!.productId,
        processId: reloadedCycle!.processId,
        phaseId: reloadedCycle!.phaseId,
        activityDomainId: reloadedCycle!.activityDomainId,
        cycleActive: reloadedCycle!.cycleActive,
        parameters: reloadedCycle!.parameters.map((p) => ({
          cycleParameterId: p.cycleParameterId,
          cycleId: p.cycleId,
          period: p.period,
          timeValue: p.timeValue
        })),
        userRole: member.role
      }
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  async delete(
    deleteCycleDto: DeleteCycleDto,
    currentUser: ValidateUser
  ): Promise<void> {
    const { cycleId } = deleteCycleDto

    const cycle = await this.cycleRepository.findOne({
      where: { cycleId, cycleActive: true }
    })

    if (!cycle) {
      throw new NotFoundException('Cycle not found')
    }

    const member = await this.cycleMemberRepository.findOne({
      where: { cycleId, userId: currentUser.userId, active: true }
    })

    if (!member || !member.role.includes(powers.editAndDelete)) {
      throw new BadRequestException(
        'User does not have permission to delete this cycle'
      )
    }

    cycle.cycleActive = false
    await this.cycleRepository.save(cycle)
  }

  private validateCycleTypeRules(dto: any): void {
    const { cycleType, cycleDeadline, cycleStartsAt, duration } = dto

    switch (cycleType) {
      case 'GENERAL':
        if (!cycleDeadline) {
          throw new BadRequestException('GENERAL cycles must have a deadline')
        }
        if (cycleStartsAt) {
          throw new BadRequestException(
            'GENERAL cycles cannot have cycleStartsAt'
          )
        }
        break

      case 'APPOINTMENT':
        if (!cycleStartsAt) {
          throw new BadRequestException(
            'APPOINTMENT cycles must have cycleStartsAt'
          )
        }
        if (!duration) {
          throw new BadRequestException('APPOINTMENT cycles must have duration')
        }
        if (cycleDeadline) {
          throw new BadRequestException(
            'APPOINTMENT cycles cannot have deadline'
          )
        }
        break

      default:
        throw new BadRequestException(
          'Cycle type must be GENERAL or APPOINTMENT'
        )
    }
  }

  private async validateActivityDomain(
    activityDomainId: number,
    orgId?: number,
    deptId?: number,
    teamId?: number,
    squadId?: number
  ): Promise<void> {
    const activityDomain = await this.activityDomainRepository.findOne({
      where: { activityDomainId: activityDomainId, activityDomainActive: true }
    })

    if (!activityDomain) {
      throw new NotFoundException('Activity domain not found')
    }

    if (orgId && activityDomain.orgId !== orgId) {
      throw new BadRequestException(
        'Activity domain must belong to the same organization'
      )
    } else if (deptId && activityDomain.deptId !== deptId) {
      throw new BadRequestException(
        'Activity domain must belong to the same department'
      )
    } else if (teamId && activityDomain.teamId !== teamId) {
      throw new BadRequestException(
        'Activity domain must belong to the same team'
      )
    } else if (squadId && activityDomain.squadId !== squadId) {
      throw new BadRequestException(
        'Activity domain must belong to the same squad'
      )
    }
  }

  private async validateCreatePermission(
    createCycleDto: CreateCycleDto,
    currentUser: ValidateUser
  ): Promise<void> {
    const {
      orgId,
      deptId,
      teamId,
      squadId,
      projectId,
      streamId,
      productId,
      processId,
      phaseId
    } = createCycleDto

    // Same permission logic as tasks
    if (orgId) {
      const member = await this.organizationMemberRepository.findOne({
        where: { userId: currentUser.userId, orgId, active: true }
      })
      if (!member || !member.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add cycles to this organization'
        )
      }
    } else if (deptId) {
      const member = await this.departmentMemberRepository.findOne({
        where: {
          userId: currentUser.userId,
          departmentId: deptId,
          active: true
        }
      })
      if (!member || !member.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add cycles to this department'
        )
      }
    } else if (teamId) {
      const member = await this.teamMemberRepository.findOne({
        where: {
          userId: currentUser.userId,
          teamId,
          active: true
        }
      })
      if (!member || !member.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add cycles to this team'
        )
      }
    } else if (squadId) {
      const member = await this.squadMemberRepository.findOne({
        where: {
          userId: currentUser.userId,
          squadId,
          active: true
        }
      })
      if (!member || !member.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add cycles to this squad'
        )
      }
    } else if (projectId) {
      const member = await this.projectMemberRepository.findOne({
        where: {
          userId: currentUser.userId,
          projectId,
          active: true
        }
      })
      if (!member || !member.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add cycles to this project'
        )
      }
    } else if (streamId) {
      const stream = await this.streamRepository.findOne({
        where: { streamId, streamActive: true }
      })
      if (!stream) {
        throw new NotFoundException('Stream not found')
      }
      const member = await this.projectMemberRepository.findOne({
        where: {
          userId: currentUser.userId,
          projectId: stream.projectId,
          active: true
        }
      })
      if (!member || !member.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add cycles to this stream'
        )
      }
    } else if (productId) {
      const member = await this.productMemberRepository.findOne({
        where: {
          userId: currentUser.userId,
          productId,
          active: true
        }
      })
      if (!member || !member.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add cycles to this product'
        )
      }
    } else if (processId) {
      const member = await this.processMemberRepository.findOne({
        where: {
          userId: currentUser.userId,
          processId,
          active: true
        }
      })
      if (!member || !member.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add cycles to this process'
        )
      }
    } else if (phaseId) {
      const phase = await this.phaseRepository.findOne({
        where: { phaseId, phaseActive: true }
      })
      if (!phase) {
        throw new NotFoundException('Phase not found')
      }
      const member = await this.processMemberRepository.findOne({
        where: {
          userId: currentUser.userId,
          processId: phase.processId,
          active: true
        }
      })
      if (!member || !member.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add cycles to this phase'
        )
      }
    }
  }
}
