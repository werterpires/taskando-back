import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards
} from '@nestjs/common'
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../users/decorators/current-user.decorator'
import { ValidateUser } from '../shared/auth/types'
import { Paginator } from '../shared/types/paginator.types'
import { Stream } from './entities/stream.entity'
import { StreamsService } from './streams.service'
import { CreateStreamDto } from './dto/create-stream.dto'
import { UpdateStreamDto } from './dto/update-stream.dto'

@Controller('streams')
@UseGuards(JwtAuthGuard)
export class StreamsController {
  constructor(private readonly streamsService: StreamsService) {}

  @Post()
  create(
    @Body() createStreamDto: CreateStreamDto,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.streamsService.create(createStreamDto, currentUser)
  }

  @Get()
  getAll(
    @Query() paginator: Paginator<Stream>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.streamsService.getAll(paginator, currentUser)
  }

  @Get('project/:projectId')
  getAllByProjectId(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() paginator: Paginator<Stream>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.streamsService.getAllByProjectId(
      projectId,
      paginator,
      currentUser
    )
  }

  @Get('activity-domain/:activityDomainId')
  getAllByActivityDomainId(
    @Param('activityDomainId', ParseIntPipe) activityDomainId: number,
    @Query() paginator: Paginator<Stream>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.streamsService.getAllByActivityDomainId(
      activityDomainId,
      paginator,
      currentUser
    )
  }

  @Get(':id')
  getOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.streamsService.getOne(id, currentUser)
  }

  @Put()
  update(
    @Body() updateStreamDto: UpdateStreamDto,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.streamsService.update(updateStreamDto, currentUser)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.streamsService.delete(id, currentUser)
  }
}
