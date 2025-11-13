import {
  Injectable,
  NotFoundException,
  BadRequestException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In, DataSource } from 'typeorm'
import { Task } from '../tasks/entities/task.entity'
import { ProcessMember } from '../processes/entities/process-member.entity'
import { Phase } from '../phases/entities/phase.entity'
import { powers } from '../constants/roles.enum'
import { ValidateUser } from '../shared/auth/types'
import { CreateTaskDependencyDto } from './dto/create-task-dependency.dto'
import { DeleteTaskDependencyDto } from './dto/delete-task-dependency.dto'
import { TaskDependency } from './entities/task-dependency.entity'
import { ITaskDependency } from './types'

@Injectable()
export class TasksDependenciesService {
  constructor(
    @InjectRepository(TaskDependency)
    private readonly taskDependencyRepository: Repository<TaskDependency>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(ProcessMember)
    private readonly processMemberRepository: Repository<ProcessMember>,
    @InjectRepository(Phase)
    private readonly phaseRepository: Repository<Phase>,
    private readonly dataSource: DataSource
  ) {}

  async create(
    createTaskDependencyDto: CreateTaskDependencyDto,
    currentUser: ValidateUser
  ): Promise<ITaskDependency> {
    const { fromTaskId, toTaskId } = createTaskDependencyDto

    // Validate both tasks exist and are active
    const [fromTask, toTask] = await Promise.all([
      this.taskRepository.findOne({
        where: { taskId: fromTaskId, taskActive: true }
      }),
      this.taskRepository.findOne({
        where: { taskId: toTaskId, taskActive: true }
      })
    ])

    if (!fromTask) {
      throw new NotFoundException('From task not found')
    }

    if (!toTask) {
      throw new NotFoundException('To task not found')
    }

    // Check if tasks have the same parent context
    if (!this.tasksHaveSameParent(fromTask, toTask)) {
      throw new BadRequestException(
        'Both tasks must belong to the same parent context'
      )
    }

    // Validate user has permission to add dependencies
    await this.validateAddPermission(fromTask, currentUser)

    // Validate integrity rules before creating dependency
    this.validateDependencyIntegrity(fromTask, toTask)

    // Check if dependency already exists
    const existingDependency = await this.taskDependencyRepository.findOne({
      where: { fromTaskId, toTaskId }
    })

    if (existingDependency) {
      throw new BadRequestException('Dependency already exists')
    }

    // Execute everything in a transaction
    const result = await this.dataSource.transaction(async (manager) => {
      // Step 1: Create dependency first (tasks_dependencies table)
      const dependency = manager.create(TaskDependency, {
        fromTaskId,
        toTaskId
      })
      await manager.save(dependency)

      // Step 2: Update dependency threads (tasks table)
      await this.updateDependencyThreadsInTransaction(fromTask, toTask, manager)

      return {
        fromTaskId: dependency.fromTaskId,
        toTaskId: dependency.toTaskId
      }
    })

    return result
  }

  async delete(
    deleteTaskDependencyDto: DeleteTaskDependencyDto,
    currentUser: ValidateUser
  ): Promise<void> {
    const { fromTaskId, toTaskId } = deleteTaskDependencyDto

    // Validate dependency exists
    const dependency = await this.taskDependencyRepository.findOne({
      where: { fromTaskId, toTaskId }
    })

    if (!dependency) {
      throw new NotFoundException('Dependency not found')
    }

    // Validate at least one task exists
    const fromTask = await this.taskRepository.findOne({
      where: { taskId: fromTaskId, taskActive: true }
    })

    if (!fromTask) {
      throw new NotFoundException('Task not found')
    }

    // Validate user has permission to remove dependencies
    await this.validateAddPermission(fromTask, currentUser)

    // Execute everything in a transaction
    await this.dataSource.transaction(async (manager) => {
      // Step 1: Delete dependency first (tasks_dependencies table)
      await manager.remove(dependency)

      // Step 2: Remove paths from all tasks (tasks table)
      await this.removeDependencyFromThreadsInTransaction(
        fromTaskId,
        toTaskId,
        fromTask,
        manager
      )
    })
  }

  /**
   * Check if two tasks have the same parent context
   * Only tasks from Process or Phase can have dependencies
   */
  private tasksHaveSameParent(task1: Task, task2: Task): boolean {
    // Both must be from Process (and same Process)
    if (
      task1.processId &&
      task2.processId &&
      !task1.phaseId &&
      !task2.phaseId
    ) {
      return task1.processId === task2.processId
    }

    // Both must be from Phase (and same Phase)
    if (task1.phaseId && task2.phaseId) {
      return task1.phaseId === task2.phaseId
    }

    return false
  }

  /**
   * Validate user has permission to add/remove dependencies
   * Only tasks from Process or Phase can have dependencies
   */
  private async validateAddPermission(
    task: Task,
    currentUser: ValidateUser
  ): Promise<void> {
    // Check if task is from Process
    if (task.processId && !task.phaseId) {
      const member = await this.processMemberRepository.findOne({
        where: {
          processId: task.processId,
          userId: currentUser.userId,
          active: true
        }
      })
      if (!member || !member.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to manage dependencies in this process'
        )
      }
      return
    }

    // Check if task is from Phase (uses ProcessMember from parent Process)
    if (task.phaseId) {
      const phase = await this.phaseRepository.findOne({
        where: { phaseId: task.phaseId, phaseActive: true }
      })
      if (!phase) {
        throw new NotFoundException('Phase not found')
      }
      const member = await this.processMemberRepository.findOne({
        where: {
          processId: phase.processId,
          userId: currentUser.userId,
          active: true
        }
      })
      if (!member || !member.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to manage dependencies in this phase'
        )
      }
      return
    }

    // Task is not from Process or Phase
    throw new BadRequestException(
      'Only tasks from Process or Phase can have dependencies'
    )
  }

  /**
   * Remove dependency F->Q from all threads (within transaction):
   * 1. In Q: remove paths ending with F
   * 2. In other tasks: remove everything up to and including F from paths containing F|Q
   */
  private async removeDependencyFromThreadsInTransaction(
    fromTaskId: number,
    toTaskId: number,
    referenceTask: Task,
    manager: any
  ): Promise<void> {
    // Get all tasks in the same parent context (Process or Phase)
    const whereClause: any = { taskActive: true }

    if (referenceTask.phaseId) {
      // Tasks from same Phase
      whereClause.phaseId = referenceTask.phaseId
    } else if (referenceTask.processId) {
      // Tasks from same Process (but not from any Phase)
      whereClause.processId = referenceTask.processId
      whereClause.phaseId = null
    }

    const allTasks = await manager.find(Task, { where: whereClause })

    const patternToFind = `${fromTaskId}|${toTaskId}`

    for (const taskToUpdate of allTasks) {
      let modified = false
      const paths = taskToUpdate.dependencyThread
        .split('||')
        .filter((path) => path !== '')

      const updatedPaths: string[] = []

      for (const path of paths) {
        if (taskToUpdate.taskId === toTaskId) {
          // In Q: remove paths ending with F
          if (path.endsWith(`${fromTaskId}|`)) {
            modified = true
            continue // Skip this path
          }
          updatedPaths.push(path)
        } else if (path.includes(patternToFind)) {
          // In other tasks: remove everything up to and including F
          const index = path.indexOf(patternToFind)
          const remainingPath = path.substring(index + `${fromTaskId}|`.length)
          if (remainingPath) {
            updatedPaths.push(remainingPath)
            modified = true
          } else {
            modified = true
          }
        } else {
          updatedPaths.push(path)
        }
      }

      if (modified) {
        if (updatedPaths.length === 0) {
          taskToUpdate.dependencyThread = '|'
        } else {
          taskToUpdate.dependencyThread = '||' + updatedPaths.join('||')
        }
        await manager.save(taskToUpdate)
      }
    }
  }

  /**
   * Validate integrity rules before adding a dependency fromTask -> toTask
   */
  private validateDependencyIntegrity(fromTask: Task, toTask: Task): void {
    // Rule 1: Avoid ascending redundancy
    // fromTask cannot already appear in any path of toTask's thread
    if (
      toTask.dependencyThread !== '|' &&
      toTask.dependencyThread.includes(`${fromTask.taskId}|`)
    ) {
      throw new BadRequestException(
        'Redundant dependency: fromTask already exists in the dependency chain of toTask'
      )
    }

    // Rule 2: Avoid cycles
    // toTask cannot already appear in any path of fromTask's thread
    if (
      fromTask.dependencyThread !== '|' &&
      fromTask.dependencyThread.includes(`${toTask.taskId}|`)
    ) {
      throw new BadRequestException(
        'Cyclic dependency: toTask already exists in the dependency chain of fromTask'
      )
    }

    // Rule 3: Avoid redundant/ambiguous paths
    // No existing path in toTask can be a prefix of the new paths being added
    const newPaths = this.generateNewPaths(
      fromTask.dependencyThread,
      fromTask.taskId
    )
    this.validateNoRedundantPaths(toTask.dependencyThread, newPaths)
  }

  /**
   * Validate that no existing path is a prefix of any new path (Rule 3)
   */
  private validateNoRedundantPaths(
    existingThread: string,
    newPaths: string
  ): void {
    if (existingThread === '|') {
      return
    }

    const existingPathsList = existingThread.split('||').filter((p) => p !== '')
    const newPathsList = newPaths.split('||').filter((p) => p !== '')

    for (const existingPath of existingPathsList) {
      for (const newPath of newPathsList) {
        // Check if existingPath is a prefix of newPath
        if (newPath.startsWith(existingPath)) {
          throw new BadRequestException(
            'Ambiguous dependency: new path would make an existing path redundant'
          )
        }
      }
    }
  }

  /**
   * Update dependency threads when a new dependency is added (within transaction)
   * Steps:
   * 1. toTask inherits all paths from fromTask, appending fromTaskId to each
   * 2. Update all descendants of toTask recursively
   */
  private async updateDependencyThreadsInTransaction(
    fromTask: Task,
    toTask: Task,
    manager: any
  ): Promise<void> {
    // Step 1: Update toTask's dependency thread
    const newPaths = this.generateNewPaths(
      fromTask.dependencyThread,
      fromTask.taskId
    )
    toTask.dependencyThread = this.mergePaths(toTask.dependencyThread, newPaths)
    await manager.save(toTask)

    // Step 2: Update all descendants recursively
    await this.updateDescendantsInTransaction(toTask, manager)
  }

  /**
   * Generate new paths by appending taskId to all paths in the thread
   */
  private generateNewPaths(dependencyThread: string, taskId: number): string {
    if (dependencyThread === '|') {
      // fromTask is a root, create a simple path
      return `|${taskId}|`
    }

    // For each path in fromTask's thread, append fromTaskId
    const paths = dependencyThread.split('||').filter((p) => p !== '')
    return paths.map((path) => `|${path}${taskId}|`).join('||')
  }

  /**
   * Merge new paths into existing dependency thread, avoiding duplicates
   */
  private mergePaths(existingThread: string, newPaths: string): string {
    if (existingThread === '|') {
      return newPaths
    }

    const existingPaths = new Set(
      existingThread.split('||').filter((p) => p !== '')
    )
    const pathsToAdd = newPaths.split('||').filter((p) => p !== '')

    pathsToAdd.forEach((path) => existingPaths.add(path))

    return '||' + Array.from(existingPaths).join('||')
  }

  /**
   * Recursively update all descendants of a task (within transaction)
   */
  private async updateDescendantsInTransaction(
    task: Task,
    manager: any
  ): Promise<void> {
    // Find all tasks that directly depend on this task
    const dependencies = await manager.find(TaskDependency, {
      where: { fromTaskId: task.taskId }
    })

    if (dependencies.length === 0) {
      return
    }

    // Get all descendant tasks
    const descendantIds = dependencies.map((dep) => dep.toTaskId)
    const descendants = await manager.findBy(Task, {
      taskId: In(descendantIds),
      taskActive: true
    })

    // Update each descendant
    for (const descendant of descendants) {
      // Generate new paths from the updated task
      const newPaths = this.generateNewPaths(task.dependencyThread, task.taskId)

      // Apply Rule 3: validate no existing path in descendant is a prefix of new paths
      this.validateNoRedundantPaths(descendant.dependencyThread, newPaths)

      // Rebuild the descendant's thread by combining all its dependencies
      await this.rebuildTaskThreadInTransaction(descendant, manager)

      // Recursively update this descendant's descendants
      await this.updateDescendantsInTransaction(descendant, manager)
    }
  }

  /**
   * Rebuild a task's dependency thread from scratch based on all its dependencies (within transaction)
   */
  private async rebuildTaskThreadInTransaction(
    task: Task,
    manager: any
  ): Promise<void> {
    // Find all direct dependencies (tasks that this task depends on)
    const dependencies = await manager.find(TaskDependency, {
      where: { toTaskId: task.taskId }
    })

    if (dependencies.length === 0) {
      task.dependencyThread = '|'
    } else {
      // Get all predecessor tasks
      const predecessorIds = dependencies.map((dep) => dep.fromTaskId)
      const predecessors = await manager.findBy(Task, {
        taskId: In(predecessorIds),
        taskActive: true
      })

      // Combine all paths from all predecessors
      let combinedThread = ''
      for (const predecessor of predecessors) {
        const newPaths = this.generateNewPaths(
          predecessor.dependencyThread,
          predecessor.taskId
        )
        combinedThread = this.mergePaths(combinedThread || '|', newPaths)
      }

      task.dependencyThread = combinedThread
    }

    await manager.save(task)
  }
}
