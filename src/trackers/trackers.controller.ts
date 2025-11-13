import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  UseGuards,
  Req
} from '@nestjs/common'
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard'
import { TrackersService } from './trackers.service'
import { CreateTrackerDto } from './dto/create-tracker.dto'
import { FinishTrackerDto } from './dto/finish-tracker.dto'
import { UpdateTrackerDto } from './dto/update-tracker.dto'
import { DeleteTrackerDto } from './dto/delete-tracker.dto'
import { ITracker } from './types'

@Controller('trackers')
@UseGuards(JwtAuthGuard)
export class TrackersController {
  constructor(private readonly trackersService: TrackersService) {}

  @Post()
  create(@Body() createTrackerDto: CreateTrackerDto, @Req() req): Promise<ITracker> {
    return this.trackersService.create(createTrackerDto, req.user)
  }

  @Put('finish')
  finish(@Body() finishTrackerDto: FinishTrackerDto, @Req() req): Promise<ITracker> {
    return this.trackersService.finish(finishTrackerDto, req.user)
  }

  @Put()
  update(@Body() updateTrackerDto: UpdateTrackerDto, @Req() req): Promise<ITracker> {
    return this.trackersService.update(updateTrackerDto, req.user)
  }

  @Delete()
  delete(@Body() deleteTrackerDto: DeleteTrackerDto, @Req() req): Promise<void> {
    return this.trackersService.delete(deleteTrackerDto, req.user)
  }
}
