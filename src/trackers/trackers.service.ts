import {
  Injectable,
  NotFoundException,
  BadRequestException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, IsNull } from 'typeorm'
import { Tracker } from './entities/tracker.entity'
import { Project } from '../projects/entities/project.entity'
import { Stream } from '../streams/entities/stream.entity'
import { Product } from '../products/entities/product.entity'
import { Process } from '../processes/entities/process.entity'
import { Phase } from '../phases/entities/phase.entity'
import { Task } from '../tasks/entities/task.entity'
import { ProjectMember } from '../projects/entities/project-member.entity'
import { ProductMember } from '../products/entities/product-member.entity'
import { ProcessMember } from '../processes/entities/process-member.entity'
import { TaskMember } from '../tasks/entities/task-member.entity'
import { powers } from '../constants/roles.enum'
import { status } from '../constants/status.enum'
import { ValidateUser } from '../shared/auth/types'
import { CreateTrackerDto } from './dto/create-tracker.dto'
import { FinishTrackerDto } from './dto/finish-tracker.dto'
import { UpdateTrackerDto } from './dto/update-tracker.dto'
import { DeleteTrackerDto } from './dto/delete-tracker.dto'
import { ITracker } from './types'

@Injectable()
export class TrackersService {
  constructor(
    @InjectRepository(Tracker)
    private readonly trackerRepository: Repository<Tracker>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Stream)
    private readonly streamRepository: Repository<Stream>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Process)
    private readonly processRepository: Repository<Process>,
    @InjectRepository(Phase)
    private readonly phaseRepository: Repository<Phase>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
    @InjectRepository(ProductMember)
    private readonly productMemberRepository: Repository<ProductMember>,
    @InjectRepository(ProcessMember)
    private readonly processMemberRepository: Repository<ProcessMember>,
    @InjectRepository(TaskMember)
    private readonly taskMemberRepository: Repository<TaskMember>
  ) {}

  async create(
    createTrackerDto: CreateTrackerDto,
    currentUser: ValidateUser
  ): Promise<ITracker> {
    const { projectId, streamId, productId, processId, phaseId, taskId } =
      createTrackerDto

    // Validate single parent
    const parentCount = [
      projectId,
      streamId,
      productId,
      processId,
      phaseId,
      taskId
    ].filter((id) => id !== undefined && id !== null).length

    if (parentCount > 1) {
      throw new BadRequestException('Tracker can have only one parent')
    }

    // Validate parent exists and status allows tracking
    if (projectId) {
      await this.validateProjectForTracking(projectId, currentUser)
    } else if (streamId) {
      await this.validateStreamForTracking(streamId, currentUser)
    } else if (productId) {
      await this.validateProductForTracking(productId, currentUser)
    } else if (processId) {
      await this.validateProcessForTracking(processId, currentUser)
    } else if (phaseId) {
      await this.validatePhaseForTracking(phaseId, currentUser)
    } else if (taskId) {
      await this.validateTaskForTracking(taskId, currentUser)
    }

    // Close any open tracker for this user (finish with current timestamp)
    const openTracker = await this.trackerRepository.findOne({
      where: { userId: currentUser.userId, endAt: IsNull() }
    })

    if (openTracker) {
      openTracker.endAt = Date.now().toString()
      await this.trackerRepository.save(openTracker)
    }

    // Create new tracker
    const tracker = this.trackerRepository.create({
      ...createTrackerDto,
      userId: currentUser.userId
    })

    const savedTracker = await this.trackerRepository.save(tracker)

    return {
      trackerId: savedTracker.trackerId,
      userId: savedTracker.userId,
      startAt: savedTracker.startAt,
      endAt: savedTracker.endAt,
      projectId: savedTracker.projectId,
      streamId: savedTracker.streamId,
      productId: savedTracker.productId,
      processId: savedTracker.processId,
      phaseId: savedTracker.phaseId,
      taskId: savedTracker.taskId
    }
  }

  async finish(
    finishTrackerDto: FinishTrackerDto,
    currentUser: ValidateUser
  ): Promise<ITracker> {
    const { trackerId, endAt } = finishTrackerDto

    const tracker = await this.trackerRepository.findOne({
      where: { trackerId }
    })

    if (!tracker) {
      throw new NotFoundException('Tracker not found')
    }

    if (tracker.userId !== currentUser.userId) {
      throw new BadRequestException(
        'Only the tracker owner can finish the tracker'
      )
    }

    if (tracker.endAt) {
      throw new BadRequestException('Tracker already finished')
    }

    tracker.endAt = endAt
    const updatedTracker = await this.trackerRepository.save(tracker)

    return {
      trackerId: updatedTracker.trackerId,
      userId: updatedTracker.userId,
      startAt: updatedTracker.startAt,
      endAt: updatedTracker.endAt,
      projectId: updatedTracker.projectId,
      streamId: updatedTracker.streamId,
      productId: updatedTracker.productId,
      processId: updatedTracker.processId,
      phaseId: updatedTracker.phaseId,
      taskId: updatedTracker.taskId
    }
  }

  async update(
    updateTrackerDto: UpdateTrackerDto,
    currentUser: ValidateUser
  ): Promise<ITracker> {
    const { trackerId } = updateTrackerDto

    const tracker = await this.trackerRepository.findOne({
      where: { trackerId }
    })

    if (!tracker) {
      throw new NotFoundException('Tracker not found')
    }

    if (tracker.userId !== currentUser.userId) {
      throw new BadRequestException(
        'Only the tracker owner can update the tracker'
      )
    }

    // Update only startAt and endAt
    if (updateTrackerDto.startAt !== undefined) {
      tracker.startAt = updateTrackerDto.startAt
    }
    if (updateTrackerDto.endAt !== undefined) {
      tracker.endAt = updateTrackerDto.endAt
    }

    const updatedTracker = await this.trackerRepository.save(tracker)

    return {
      trackerId: updatedTracker.trackerId,
      userId: updatedTracker.userId,
      startAt: updatedTracker.startAt,
      endAt: updatedTracker.endAt,
      projectId: updatedTracker.projectId,
      streamId: updatedTracker.streamId,
      productId: updatedTracker.productId,
      processId: updatedTracker.processId,
      phaseId: updatedTracker.phaseId,
      taskId: updatedTracker.taskId
    }
  }

  async delete(
    deleteTrackerDto: DeleteTrackerDto,
    currentUser: ValidateUser
  ): Promise<void> {
    const { trackerId } = deleteTrackerDto

    const tracker = await this.trackerRepository.findOne({
      where: { trackerId }
    })

    if (!tracker) {
      throw new NotFoundException('Tracker not found')
    }

    if (tracker.userId !== currentUser.userId) {
      throw new BadRequestException(
        'Only the tracker owner can delete the tracker'
      )
    }

    await this.trackerRepository.remove(tracker)
  }

  private async validateProjectForTracking(
    projectId: number,
    currentUser: ValidateUser
  ): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { projectId, projectActive: true }
    })

    if (!project) {
      throw new NotFoundException('Project not found')
    }

    const blockedStatuses = [
      status.CANCELLED,
      status.ARCHIVED,
      status.DONE,
      status.BLOCKED
    ]
    if (blockedStatuses.includes(project.projectStatus as any)) {
      throw new BadRequestException(
        'Cannot track time on projects with status CANCELLED, ARCHIVED, DONE or BLOCKED'
      )
    }

    const member = await this.projectMemberRepository.findOne({
      where: { projectId, userId: currentUser.userId, active: true }
    })

    if (!member || !member.role.includes(powers.seeChildren)) {
      throw new BadRequestException(
        'User does not have permission to track time on this project'
      )
    }
  }

  private async validateStreamForTracking(
    streamId: number,
    currentUser: ValidateUser
  ): Promise<void> {
    const stream = await this.streamRepository.findOne({
      where: { streamId, streamActive: true }
    })

    if (!stream) {
      throw new NotFoundException('Stream not found')
    }

    const blockedStatuses = [
      status.CANCELLED,
      status.ARCHIVED,
      status.DONE,
      status.BLOCKED
    ]
    if (blockedStatuses.includes(stream.streamStatus as any)) {
      throw new BadRequestException(
        'Cannot track time on streams with status CANCELLED, ARCHIVED, DONE or BLOCKED'
      )
    }

    // Stream uses ProjectMember
    const member = await this.projectMemberRepository.findOne({
      where: {
        projectId: stream.projectId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (!member || !member.role.includes(powers.seeChildren)) {
      throw new BadRequestException(
        'User does not have permission to track time on this stream'
      )
    }
  }

  private async validateProductForTracking(
    productId: number,
    currentUser: ValidateUser
  ): Promise<void> {
    const product = await this.productRepository.findOne({
      where: { productId, productActive: true }
    })

    if (!product) {
      throw new NotFoundException('Product not found')
    }

    const blockedStatuses = [
      status.CANCELLED,
      status.ARCHIVED,
      status.DONE,
      status.BLOCKED
    ]
    if (blockedStatuses.includes(product.productStatus as any)) {
      throw new BadRequestException(
        'Cannot track time on products with status CANCELLED, ARCHIVED, DONE or BLOCKED'
      )
    }

    const member = await this.productMemberRepository.findOne({
      where: { productId, userId: currentUser.userId, active: true }
    })

    if (!member || !member.role.includes(powers.seeChildren)) {
      throw new BadRequestException(
        'User does not have permission to track time on this product'
      )
    }
  }

  private async validateProcessForTracking(
    processId: number,
    currentUser: ValidateUser
  ): Promise<void> {
    const process = await this.processRepository.findOne({
      where: { processId, processActive: true }
    })

    if (!process) {
      throw new NotFoundException('Process not found')
    }

    const blockedStatuses = [
      status.CANCELLED,
      status.ARCHIVED,
      status.DONE,
      status.BLOCKED
    ]
    if (blockedStatuses.includes(process.processStatus as any)) {
      throw new BadRequestException(
        'Cannot track time on processes with status CANCELLED, ARCHIVED, DONE or BLOCKED'
      )
    }

    const member = await this.processMemberRepository.findOne({
      where: { processId, userId: currentUser.userId, active: true }
    })

    if (!member || !member.role.includes(powers.seeChildren)) {
      throw new BadRequestException(
        'User does not have permission to track time on this process'
      )
    }
  }

  private async validatePhaseForTracking(
    phaseId: number,
    currentUser: ValidateUser
  ): Promise<void> {
    const phase = await this.phaseRepository.findOne({
      where: { phaseId, phaseActive: true }
    })

    if (!phase) {
      throw new NotFoundException('Phase not found')
    }

    const blockedStatuses = [
      status.CANCELLED,
      status.ARCHIVED,
      status.DONE,
      status.BLOCKED
    ]
    if (blockedStatuses.includes(phase.phaseStatus as any)) {
      throw new BadRequestException(
        'Cannot track time on phases with status CANCELLED, ARCHIVED, DONE or BLOCKED'
      )
    }

    // Phase uses ProcessMember
    const member = await this.processMemberRepository.findOne({
      where: {
        processId: phase.processId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (!member || !member.role.includes(powers.seeChildren)) {
      throw new BadRequestException(
        'User does not have permission to track time on this phase'
      )
    }
  }

  private async validateTaskForTracking(
    taskId: number,
    currentUser: ValidateUser
  ): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { taskId, taskActive: true }
    })

    if (!task) {
      throw new NotFoundException('Task not found')
    }

    const blockedStatuses = [
      status.CANCELLED,
      status.ARCHIVED,
      status.DONE,
      status.BLOCKED
    ]
    if (blockedStatuses.includes(task.taskStatus as any)) {
      throw new BadRequestException(
        'Cannot track time on tasks with status CANCELLED, ARCHIVED, DONE or BLOCKED'
      )
    }

    const member = await this.taskMemberRepository.findOne({
      where: { taskId, userId: currentUser.userId, active: true }
    })

    if (!member || !member.role.includes(powers.seeChildren)) {
      throw new BadRequestException(
        'User does not have permission to track time on this task'
      )
    }
  }
}
