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
import { ProjectMember } from '../projects/entities/project-member.entity'
import { ProductMember } from '../products/entities/product-member.entity'
import { ProcessMember } from '../processes/entities/process-member.entity'
import { PhaseMember } from '../phases/entities/phase-member.entity'
import { ActivityDomain } from '../activity-domains/entities/activity-domain.entity'
import { Stream } from '../streams/entities/stream.entity'
import { Product } from '../products/entities/product.entity'
import { Process } from '../processes/entities/process.entity'
import { Phase } from '../phases/entities/phase.entity'
import { ValidateUser } from '../shared/auth/types'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { Task } from './entities/task.entity'
import { TaskMember } from './entities/task-member.entity'
import { ITask } from './types'
import { TasksHelper } from './tasks.helper'

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskMember)
    private readonly taskMemberRepository: Repository<TaskMember>,
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
    @InjectRepository(PhaseMember)
    private readonly phaseMemberRepository: Repository<PhaseMember>,
    @InjectRepository(ActivityDomain)
    private readonly activityDomainRepository: Repository<ActivityDomain>,
    private readonly dataSource: DataSource,
    private readonly tasksHelper: TasksHelper
  ) {}

  async create(
    createTaskDto: CreateTaskDto,
    currentUser: ValidateUser
  ): Promise<ITask> {
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
      activityDomainId
    } = createTaskDto

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
      throw new BadRequestException('Task can have only one parent')
    }

    // Validate task type rules
    this.validateTaskTypeRules(createTaskDto)

    // Validate activityDomain if provided
    if (activityDomainId) {
      const activityDomain = await this.activityDomainRepository.findOne({
        where: { areaId: activityDomainId, activityDomainActive: true }
      })

      if (!activityDomain) {
        throw new NotFoundException('Activity domain not found')
      }

      // Validate activity domain belongs to same parent
      if (orgId && activityDomain.orgId !== orgId) {
        throw new BadRequestException(
          'Activity domain must belong to the same organization as the task'
        )
      } else if (deptId && activityDomain.deptId !== deptId) {
        throw new BadRequestException(
          'Activity domain must belong to the same department as the task'
        )
      } else if (teamId && activityDomain.teamId !== teamId) {
        throw new BadRequestException(
          'Activity domain must belong to the same team as the task'
        )
      } else if (squadId && activityDomain.squadId !== squadId) {
        throw new BadRequestException(
          'Activity domain must belong to the same squad as the task'
        )
      } else if (!orgId && !deptId && !teamId && !squadId) {
        // Task has no parent - activity domain must also have no parent
        const activityDomainHasParent = !!(
          activityDomain.orgId ||
          activityDomain.deptId ||
          activityDomain.teamId ||
          activityDomain.squadId
        )
        if (activityDomainHasParent) {
          throw new BadRequestException(
            'Activity domain must have no parent when task has no parent'
          )
        }
      }
    }

    // Check if user has permission to create in the parent
    await this.validateCreatePermission(currentUser, createTaskDto)

    // Create the task with transaction
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const task = this.taskRepository.create({
        ...createTaskDto,
        dependencyThread: '|',
        taskActive: true
      })

      const savedTask = await queryRunner.manager.save(task)

      // Add creator as member with full powers
      const taskMember = this.taskMemberRepository.create({
        userId: currentUser.userId,
        taskId: savedTask.taskId,
        role: `${powers.view},${powers.editAndDelete},${powers.addChildren}`,
        active: true
      })

      await queryRunner.manager.save(taskMember)

      await queryRunner.commitTransaction()

      return {
        taskId: savedTask.taskId,
        taskName: savedTask.taskName,
        taskDescription: savedTask.taskDescription,
        taskStartDate: savedTask.taskStartDate,
        taskEndDate: savedTask.taskEndDate,
        taskDeadline: savedTask.taskDeadline,
        taskStatus: savedTask.taskStatus,
        taskPriority: savedTask.taskPriority,
        size: savedTask.size,
        taskType: savedTask.taskType,
        taskStartsAt: savedTask.taskStartsAt,
        duration: savedTask.duration,
        taskShowInCalendar: savedTask.taskShowInCalendar,
        orgId: savedTask.orgId,
        deptId: savedTask.deptId,
        teamId: savedTask.teamId,
        squadId: savedTask.squadId,
        projectId: savedTask.projectId,
        streamId: savedTask.streamId,
        productId: savedTask.productId,
        processId: savedTask.processId,
        phaseId: savedTask.phaseId,
        activityDomainId: savedTask.activityDomainId,
        taskActive: savedTask.taskActive,
        userRole: taskMember.role
      }
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  async getOne(taskId: number, currentUser: ValidateUser): Promise<ITask> {
    const task = await this.taskRepository
      .createQueryBuilder('task')
      .innerJoin(
        'task_members',
        'member',
        'member.task_id = task.taskId AND member.user_id = :userId AND member.active = true',
        { userId: currentUser.userId }
      )
      .where('task.taskId = :taskId', { taskId })
      .andWhere('task.taskActive = true')
      .andWhere('member.role LIKE :viewPower', {
        viewPower: `%${powers.view}%`
      })
      .select(['task.*', 'member.role'])
      .getRawOne()

    if (!task) {
      throw new NotFoundException('Task not found or access denied')
    }

    const currentUserMember = await this.taskMemberRepository.findOne({
      where: {
        taskId: task.taskId,
        userId: currentUser.userId,
        active: true
      }
    })

    return {
      taskId: task.taskId,
      taskName: task.taskName,
      taskDescription: task.taskDescription,
      taskStartDate: task.taskStartDate,
      taskEndDate: task.taskEndDate,
      taskDeadline: task.taskDeadline,
      taskStatus: task.taskStatus,
      taskPriority: task.taskPriority,
      size: task.size,
      taskType: task.taskType,
      taskStartsAt: task.taskStartsAt,
      duration: task.duration,
      taskShowInCalendar: task.taskShowInCalendar,
      orgId: task.orgId,
      deptId: task.deptId,
      teamId: task.teamId,
      squadId: task.squadId,
      projectId: task.projectId,
      streamId: task.streamId,
      productId: task.productId,
      processId: task.processId,
      phaseId: task.phaseId,
      activityDomainId: task.activityDomainId,
      taskActive: task.taskActive,
      userRole: currentUserMember?.role
    }
  }

  async update(
    updateTaskDto: UpdateTaskDto,
    currentUser: ValidateUser
  ): Promise<ITask> {
    const { taskId } = updateTaskDto

    // Verify task exists and user has permission
    const task = await this.taskRepository.findOne({
      where: { taskId, taskActive: true }
    })

    if (!task) {
      throw new NotFoundException('Task not found')
    }

    const taskMember = await this.taskMemberRepository.findOne({
      where: { taskId, userId: currentUser.userId, active: true }
    })

    if (!taskMember || !taskMember.role.includes(powers.editAndDelete)) {
      throw new BadRequestException(
        'User does not have permission to edit this task'
      )
    }

    // Validate task type rules - merge current task data with updates
    const taskToValidate = {
      ...task,
      ...updateTaskDto
    }
    this.validateTaskTypeRules(taskToValidate)

    // Update task
    Object.assign(task, updateTaskDto)
    const updatedTask = await this.taskRepository.save(task)

    return {
      taskId: updatedTask.taskId,
      taskName: updatedTask.taskName,
      taskDescription: updatedTask.taskDescription,
      taskStartDate: updatedTask.taskStartDate,
      taskEndDate: updatedTask.taskEndDate,
      taskDeadline: updatedTask.taskDeadline,
      taskStatus: updatedTask.taskStatus,
      taskPriority: updatedTask.taskPriority,
      size: updatedTask.size,
      taskType: updatedTask.taskType,
      taskStartsAt: updatedTask.taskStartsAt,
      duration: updatedTask.duration,
      taskShowInCalendar: updatedTask.taskShowInCalendar,
      orgId: updatedTask.orgId,
      deptId: updatedTask.deptId,
      teamId: updatedTask.teamId,
      squadId: updatedTask.squadId,
      projectId: updatedTask.projectId,
      streamId: updatedTask.streamId,
      productId: updatedTask.productId,
      processId: updatedTask.processId,
      phaseId: updatedTask.phaseId,
      activityDomainId: updatedTask.activityDomainId,
      taskActive: updatedTask.taskActive,
      userRole: taskMember.role
    }
  }

  async delete(taskId: number, currentUser: ValidateUser): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { taskId, taskActive: true }
    })

    if (!task) {
      throw new NotFoundException('Task not found')
    }

    const taskMember = await this.taskMemberRepository.findOne({
      where: { taskId, userId: currentUser.userId, active: true }
    })

    if (!taskMember || !taskMember.role.includes(powers.editAndDelete)) {
      throw new BadRequestException(
        'User does not have permission to delete this task'
      )
    }

    task.taskActive = false
    await this.taskRepository.save(task)
  }

  private async validateCreatePermission(
    currentUser: ValidateUser,
    createTaskDto: CreateTaskDto
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
    } = createTaskDto

    if (orgId) {
      const member = await this.organizationMemberRepository.findOne({
        where: { userId: currentUser.userId, orgId, active: true }
      })
      if (!member || !member.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add tasks to this organization'
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
          'User does not have permission to add tasks to this department'
        )
      }
    } else if (teamId) {
      const member = await this.teamMemberRepository.findOne({
        where: { userId: currentUser.userId, teamId, active: true }
      })
      if (!member || !member.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add tasks to this team'
        )
      }
    } else if (squadId) {
      const member = await this.squadMemberRepository.findOne({
        where: { userId: currentUser.userId, squadId, active: true }
      })
      if (!member || !member.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add tasks to this squad'
        )
      }
    } else if (projectId) {
      const member = await this.projectMemberRepository.findOne({
        where: { userId: currentUser.userId, projectId, active: true }
      })
      if (!member || !member.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add tasks to this project'
        )
      }
    } else if (streamId) {
      // Stream belongs to Project, check Project permission
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
          'User does not have permission to add tasks to this stream'
        )
      }
    } else if (productId) {
      const member = await this.productMemberRepository.findOne({
        where: { userId: currentUser.userId, productId, active: true }
      })
      if (!member || !member.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add tasks to this product'
        )
      }
    } else if (processId) {
      const member = await this.processMemberRepository.findOne({
        where: { userId: currentUser.userId, processId, active: true }
      })
      if (!member || !member.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add tasks to this process'
        )
      }
    } else if (phaseId) {
      // Phase belongs to Process, check Process permission
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
          'User does not have permission to add tasks to this phase'
        )
      }
    }
  }

  /**
   * Validate task type specific rules:
   * - GENERAL: must have deadline, cannot have startAt
   * - APPOINTMENT: must have startAt and duration, cannot have deadline
   * - ACTIVITY: cannot have deadline or startAt
   * - PLAN: cannot have deadline or startAt
   */
  private validateTaskTypeRules(dto: any): void {
    const { taskType, taskDeadline, taskStartsAt, duration } = dto

    switch (taskType) {
      case 'GENERAL':
        if (!taskDeadline) {
          throw new BadRequestException('GENERAL tasks must have a deadline')
        }
        if (taskStartsAt) {
          throw new BadRequestException(
            'GENERAL tasks cannot have taskStartsAt'
          )
        }
        break

      case 'APPOINTMENT':
        if (!taskStartsAt) {
          throw new BadRequestException(
            'APPOINTMENT tasks must have taskStartsAt'
          )
        }
        if (!duration) {
          throw new BadRequestException('APPOINTMENT tasks must have duration')
        }
        if (taskDeadline) {
          throw new BadRequestException(
            'APPOINTMENT tasks cannot have deadline'
          )
        }
        break

      case 'ACTIVITY':
        if (taskDeadline) {
          throw new BadRequestException('ACTIVITY tasks cannot have deadline')
        }
        if (taskStartsAt) {
          throw new BadRequestException(
            'ACTIVITY tasks cannot have taskStartsAt'
          )
        }
        break

      case 'PLAN':
        if (taskDeadline) {
          throw new BadRequestException('PLAN tasks cannot have deadline')
        }
        if (taskStartsAt) {
          throw new BadRequestException('PLAN tasks cannot have taskStartsAt')
        }
        break

      default:
        throw new BadRequestException(
          'Invalid task type. Must be GENERAL, APPOINTMENT, ACTIVITY, or PLAN'
        )
    }
  }
}
