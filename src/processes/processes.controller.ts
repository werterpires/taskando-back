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
import { ProcessesService } from './processes.service'
import { CreateProcessDto } from './dto/create-process.dto'
import { UpdateProcessDto } from './dto/update-process.dto'
import { Process } from './entities/process.entity'
import { IProcess } from './types'

@Controller('processes')
@UseGuards(JwtAuthGuard)
export class ProcessesController {
  constructor(private readonly processesService: ProcessesService) {}

  @Post()
  async create(
    @Body() createProcessDto: CreateProcessDto,
    @CurrentUser() currentUser: ValidateUser
  ): Promise<IProcess> {
    return this.processesService.create(createProcessDto, currentUser)
  }

  @Get(':id')
  async getOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: ValidateUser
  ): Promise<IProcess> {
    return this.processesService.getOne(+id, currentUser)
  }

  @Get()
  async getAll(
    @Query() paginator: Paginator<Process>,
    @CurrentUser() currentUser: ValidateUser
  ): Promise<Response<Process, IProcess>> {
    return this.processesService.getAll(paginator, currentUser)
  }

  @Put()
  async update(
    @Body() updateProcessDto: UpdateProcessDto,
    @CurrentUser() currentUser: ValidateUser
  ): Promise<IProcess> {
    return this.processesService.update(updateProcessDto, currentUser)
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() currentUser: ValidateUser
  ): Promise<void> {
    return this.processesService.delete(+id, currentUser)
  }
}
