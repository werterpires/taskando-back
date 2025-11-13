import {
  Injectable,
  NotFoundException,
  BadRequestException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In, DataSource } from 'typeorm'
import { Phase } from '../phases/entities/phase.entity'
import { ProcessMember } from '../processes/entities/process-member.entity'
import { powers } from '../constants/roles.enum'
import { ValidateUser } from '../shared/auth/types'
import { CreatePhaseDependencyDto } from './dto/create-phase-dependency.dto'
import { DeletePhaseDependencyDto } from './dto/delete-phase-dependency.dto'
import { PhaseDependency } from './entities/phase-dependency.entity'
import { IPhaseDependency } from './types'

@Injectable()
export class PhasesDependenciesService {
  constructor(
    @InjectRepository(PhaseDependency)
    private readonly phaseDependencyRepository: Repository<PhaseDependency>,
    @InjectRepository(Phase)
    private readonly phaseRepository: Repository<Phase>,
    @InjectRepository(ProcessMember)
    private readonly processMemberRepository: Repository<ProcessMember>,
    private readonly dataSource: DataSource
  ) {}

  async create(
    createPhaseDependencyDto: CreatePhaseDependencyDto,
    currentUser: ValidateUser
  ): Promise<IPhaseDependency> {
    const { fromPhaseId, toPhaseId } = createPhaseDependencyDto

    // Validate both phases exist, are active, and belong to the same process
    const [fromPhase, toPhase] = await Promise.all([
      this.phaseRepository.findOne({
        where: { phaseId: fromPhaseId, phaseActive: true }
      }),
      this.phaseRepository.findOne({
        where: { phaseId: toPhaseId, phaseActive: true }
      })
    ])

    if (!fromPhase) {
      throw new NotFoundException('From phase not found')
    }

    if (!toPhase) {
      throw new NotFoundException('To phase not found')
    }

    if (fromPhase.processId !== toPhase.processId) {
      throw new BadRequestException(
        'Both phases must belong to the same process'
      )
    }

    // Check user has addChildren permission on the parent process
    const processMember = await this.processMemberRepository.findOne({
      where: {
        processId: fromPhase.processId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (!processMember || !processMember.role.includes(powers.addChildren)) {
      throw new BadRequestException(
        'User does not have permission to add dependencies in this process'
      )
    }

    // Validate integrity rules before creating dependency
    this.validateDependencyIntegrity(fromPhase, toPhase)

    // Check if dependency already exists
    const existingDependency = await this.phaseDependencyRepository.findOne({
      where: { fromPhaseId, toPhaseId }
    })

    if (existingDependency) {
      throw new BadRequestException('Dependency already exists')
    }

    // Execute everything in a transaction
    const result = await this.dataSource.transaction(async (manager) => {
      // Step 1: Create dependency first (phases_dependencies table)
      const dependency = manager.create(PhaseDependency, {
        fromPhaseId,
        toPhaseId
      })
      await manager.save(dependency)

      // Step 2: Update dependency threads (phases table)
      await this.updateDependencyThreadsInTransaction(
        fromPhase,
        toPhase,
        manager
      )

      return {
        fromPhaseId: dependency.fromPhaseId,
        toPhaseId: dependency.toPhaseId
      }
    })

    return result
  }

  async delete(
    deletePhaseDependencyDto: DeletePhaseDependencyDto,
    currentUser: ValidateUser
  ): Promise<void> {
    const { fromPhaseId, toPhaseId } = deletePhaseDependencyDto

    // Validate dependency exists
    const dependency = await this.phaseDependencyRepository.findOne({
      where: { fromPhaseId, toPhaseId }
    })

    if (!dependency) {
      throw new NotFoundException('Dependency not found')
    }

    // Validate at least one phase exists to get the processId
    const fromPhase = await this.phaseRepository.findOne({
      where: { phaseId: fromPhaseId, phaseActive: true }
    })

    if (!fromPhase) {
      throw new NotFoundException('Phase not found')
    }

    // Check user has addChildren permission on the parent process
    const processMember = await this.processMemberRepository.findOne({
      where: {
        processId: fromPhase.processId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (!processMember || !processMember.role.includes(powers.addChildren)) {
      throw new BadRequestException(
        'User does not have permission to delete dependencies in this process'
      )
    }

    // Execute everything in a transaction
    await this.dataSource.transaction(async (manager) => {
      // Step 1: Delete dependency first (phases_dependencies table)
      await manager.remove(dependency)

      // Step 2: Remove paths from all phases (phases table)
      await this.removeDependencyFromThreadsInTransaction(
        fromPhaseId,
        toPhaseId,
        fromPhase.processId,
        manager
      )
    })
  }

  /**
   * Remove dependency F->Q from all threads (within transaction):
   * 1. In Q: remove paths ending with F
   * 2. In other phases: remove everything up to and including F from paths containing F|Q
   */
  private async removeDependencyFromThreadsInTransaction(
    fromPhaseId: number,
    toPhaseId: number,
    processId: number,
    manager: any
  ): Promise<void> {
    // Get all phases in the same process
    const allPhases = await manager.find(Phase, {
      where: { processId, phaseActive: true }
    })

    const patternToFind = `${fromPhaseId}|${toPhaseId}`

    for (const phaseToUpdate of allPhases) {
      let modified = false
      const paths = phaseToUpdate.dependencyThread
        .split('||')
        .filter((path) => path !== '')

      const updatedPaths: string[] = []

      for (const path of paths) {
        if (phaseToUpdate.phaseId === toPhaseId) {
          // In Q: remove paths ending with F
          if (path.endsWith(`${fromPhaseId}|`)) {
            modified = true
            continue // Skip this path
          }
          updatedPaths.push(path)
        } else if (path.includes(patternToFind)) {
          // In other phases: remove everything up to and including F
          const index = path.indexOf(patternToFind)
          const remainingPath = path.substring(index + `${fromPhaseId}|`.length)
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
          phaseToUpdate.dependencyThread = '|'
        } else {
          phaseToUpdate.dependencyThread = '||' + updatedPaths.join('||')
        }
        await manager.save(phaseToUpdate)
      }
    }
  }

  /**
   * Validate integrity rules before adding a dependency fromPhase -> toPhase
   */
  private validateDependencyIntegrity(fromPhase: Phase, toPhase: Phase): void {
    // Rule 1: Avoid ascending redundancy
    // fromPhase cannot already appear in any path of toPhase's thread
    if (
      toPhase.dependencyThread !== '|' &&
      toPhase.dependencyThread.includes(`${fromPhase.phaseId}|`)
    ) {
      throw new BadRequestException(
        'Redundant dependency: fromPhase already exists in the dependency chain of toPhase'
      )
    }

    // Rule 2: Avoid cycles
    // toPhase cannot already appear in any path of fromPhase's thread
    if (
      fromPhase.dependencyThread !== '|' &&
      fromPhase.dependencyThread.includes(`${toPhase.phaseId}|`)
    ) {
      throw new BadRequestException(
        'Cyclic dependency: toPhase already exists in the dependency chain of fromPhase'
      )
    }

    // Rule 3: Avoid redundant/ambiguous paths
    // No existing path in toPhase can be a prefix of the new paths being added
    const newPaths = this.generateNewPaths(
      fromPhase.dependencyThread,
      fromPhase.phaseId
    )
    this.validateNoRedundantPaths(toPhase.dependencyThread, newPaths)
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
   * 1. toPhase inherits all paths from fromPhase, appending fromPhaseId to each
   * 2. Update all descendants of toPhase recursively
   */
  private async updateDependencyThreadsInTransaction(
    fromPhase: Phase,
    toPhase: Phase,
    manager: any
  ): Promise<void> {
    // Step 1: Update toPhase's dependency thread
    const newPaths = this.generateNewPaths(
      fromPhase.dependencyThread,
      fromPhase.phaseId
    )
    toPhase.dependencyThread = this.mergePaths(
      toPhase.dependencyThread,
      newPaths
    )
    await manager.save(toPhase)

    // Step 2: Update all descendants recursively
    await this.updateDescendantsInTransaction(toPhase, manager)
  }

  /**
   * Generate new paths by appending phaseId to all paths in the thread
   */
  private generateNewPaths(dependencyThread: string, phaseId: number): string {
    if (dependencyThread === '|') {
      // fromPhase is a root, create a simple path
      return `|${phaseId}|`
    }

    // For each path in fromPhase's thread, append fromPhaseId
    const paths = dependencyThread.split('||').filter((p) => p !== '')
    return paths.map((path) => `|${path}${phaseId}|`).join('||')
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
   * Recursively update all descendants of a phase (within transaction)
   */
  private async updateDescendantsInTransaction(
    phase: Phase,
    manager: any
  ): Promise<void> {
    // Find all phases that directly depend on this phase
    const dependencies = await manager.find(PhaseDependency, {
      where: { fromPhaseId: phase.phaseId }
    })

    if (dependencies.length === 0) {
      return
    }

    // Get all descendant phases
    const descendantIds = dependencies.map((dep) => dep.toPhaseId)
    const descendants = await manager.findBy(Phase, {
      phaseId: In(descendantIds),
      phaseActive: true
    })

    // Update each descendant
    for (const descendant of descendants) {
      // Generate new paths from the updated phase
      const newPaths = this.generateNewPaths(
        phase.dependencyThread,
        phase.phaseId
      )

      // Apply Rule 3: validate no existing path in descendant is a prefix of new paths
      this.validateNoRedundantPaths(descendant.dependencyThread, newPaths)

      // Rebuild the descendant's thread by combining all its dependencies
      await this.rebuildPhaseThreadInTransaction(descendant, manager)

      // Recursively update this descendant's descendants
      await this.updateDescendantsInTransaction(descendant, manager)
    }
  }

  /**
   * Rebuild a phase's dependency thread from scratch based on all its dependencies (within transaction)
   */
  private async rebuildPhaseThreadInTransaction(
    phase: Phase,
    manager: any
  ): Promise<void> {
    // Find all direct dependencies (phases that this phase depends on)
    const dependencies = await manager.find(PhaseDependency, {
      where: { toPhaseId: phase.phaseId }
    })

    if (dependencies.length === 0) {
      phase.dependencyThread = '|'
    } else {
      // Get all predecessor phases
      const predecessorIds = dependencies.map((dep) => dep.fromPhaseId)
      const predecessors = await manager.findBy(Phase, {
        phaseId: In(predecessorIds),
        phaseActive: true
      })

      // Combine all paths from all predecessors
      let combinedThread = ''
      for (const predecessor of predecessors) {
        const newPaths = this.generateNewPaths(
          predecessor.dependencyThread,
          predecessor.phaseId
        )
        combinedThread = this.mergePaths(combinedThread || '|', newPaths)
      }

      phase.dependencyThread = combinedThread
    }

    await manager.save(phase)
  }
}
