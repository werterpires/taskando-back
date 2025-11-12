import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query
} from '@nestjs/common'
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../users/decorators/current-user.decorator'
import { ValidateUser } from '../shared/auth/types'
import { Paginator } from '../shared/types/paginator.types'
import { Response } from '../shared/types/response.types'
import { PhasesService } from './phases.service'
import { CreatePhaseDto } from './dto/create-phase.dto'
import { UpdatePhaseDto } from './dto/update-phase.dto'
import { Phase } from './entities/phase.entity'
import { IPhase } from './types'

@Controller('phases')
@UseGuards(JwtAuthGuard)
export class PhasesController {
  constructor(private readonly phasesService: PhasesService) {}

  @Post()
  async create(
    @Body() createPhaseDto: CreatePhaseDto,
    @CurrentUser() currentUser: ValidateUser
  ): Promise<IPhase> {
    return this.phasesService.create(createPhaseDto, currentUser)
  }

  @Get(':id')
  async getOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: ValidateUser
  ): Promise<IPhase> {
    return this.phasesService.getOne(+id, currentUser)
  }

  @Get()
  async getAll(
    @Query() paginator: Paginator<Phase>,
    @CurrentUser() currentUser: ValidateUser
  ): Promise<Response<Phase, IPhase>> {
    return this.phasesService.getAll(paginator, currentUser)
  }

  @Put()
  async update(
    @Body() updatePhaseDto: UpdatePhaseDto,
    @CurrentUser() currentUser: ValidateUser
  ): Promise<IPhase> {
    return this.phasesService.update(updatePhaseDto, currentUser)
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() currentUser: ValidateUser
  ): Promise<void> {
    return this.phasesService.delete(+id, currentUser)
  }
}
