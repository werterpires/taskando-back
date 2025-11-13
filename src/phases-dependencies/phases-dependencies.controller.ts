import { Controller, Post, Delete, Body, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../users/decorators/current-user.decorator'
import { ValidateUser } from '../shared/auth/types'
import { PhasesDependenciesService } from './phases-dependencies.service'
import { CreatePhaseDependencyDto } from './dto/create-phase-dependency.dto'
import { DeletePhaseDependencyDto } from './dto/delete-phase-dependency.dto'
import { IPhaseDependency } from './types'

@Controller('phases-dependencies')
@UseGuards(JwtAuthGuard)
export class PhasesDependenciesController {
  constructor(
    private readonly phasesDependenciesService: PhasesDependenciesService
  ) {}

  @Post()
  async create(
    @Body() createPhaseDependencyDto: CreatePhaseDependencyDto,
    @CurrentUser() currentUser: ValidateUser
  ): Promise<IPhaseDependency> {
    return this.phasesDependenciesService.create(
      createPhaseDependencyDto,
      currentUser
    )
  }

  @Delete()
  async delete(
    @Body() deletePhaseDependencyDto: DeletePhaseDependencyDto,
    @CurrentUser() currentUser: ValidateUser
  ): Promise<void> {
    return this.phasesDependenciesService.delete(
      deletePhaseDependencyDto,
      currentUser
    )
  }
}
