import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req
} from '@nestjs/common'
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard'
import { CyclesService } from './cycles.service'
import { CreateCycleDto } from './dto/create-cycle.dto'
import { UpdateCycleDto } from './dto/update-cycle.dto'
import { DeleteCycleDto } from './dto/delete-cycle.dto'
import { ICycle } from './types'

@Controller('cycles')
@UseGuards(JwtAuthGuard)
export class CyclesController {
  constructor(private readonly cyclesService: CyclesService) {}

  @Post()
  create(@Body() createCycleDto: CreateCycleDto, @Req() req): Promise<ICycle> {
    return this.cyclesService.create(createCycleDto, req.user)
  }

  @Get(':id')
  getOne(@Param('id') id: string, @Req() req): Promise<ICycle> {
    return this.cyclesService.getOne(parseInt(id, 10), req.user)
  }

  @Put()
  update(@Body() updateCycleDto: UpdateCycleDto, @Req() req): Promise<ICycle> {
    return this.cyclesService.update(updateCycleDto, req.user)
  }

  @Delete()
  delete(@Body() deleteCycleDto: DeleteCycleDto, @Req() req): Promise<void> {
    return this.cyclesService.delete(deleteCycleDto, req.user)
  }
}
