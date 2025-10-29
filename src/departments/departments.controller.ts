import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  Param,
  Put,
  Delete
} from '@nestjs/common'
import { DepartmentsService } from './departments.service'
import { CreateDepartmentDto } from './dto/create-department.dto'
import { UpdateDepartmentDto } from './dto/update-department.dto'
import { CurrentUser } from '../users/decorators/current-user.decorator'
import { ValidateUser } from '../shared/auth/types'
import { Paginator } from '../shared/types/paginator.types'

@Controller('departments')
export class DepartmentsController {
  @Delete(':id')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.departmentsService.delete(id, currentUser)
  }
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  create(
    @Body() createDepartmentDto: CreateDepartmentDto,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.departmentsService.create(createDepartmentDto, currentUser)
  }

  @Get()
  getAll(
    @CurrentUser() currentUser: ValidateUser,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('orderBy', new DefaultValuePipe('deptId')) orderBy: string,
    @Query('direction', new DefaultValuePipe('ASC')) direction: string
  ) {
    const paginator: Paginator = { limit, offset, orderBy, direction }
    return this.departmentsService.getAll(currentUser, paginator)
  }

  @Get('organization/:orgId')
  findAllByOrgId(
    @Param('orgId', ParseIntPipe) orgId: number,
    @CurrentUser() currentUser: ValidateUser,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('direction', new DefaultValuePipe('ASC')) direction: string
  ) {
    const paginator: Paginator = { limit, offset, orderBy: 'deptId', direction }
    return this.departmentsService.findAllByOrgId(orgId, currentUser, paginator)
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.departmentsService.findOne(id, currentUser)
  }

  @Put()
  update(
    @Body() updateDepartmentDto: UpdateDepartmentDto,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.departmentsService.update(updateDepartmentDto, currentUser)
  }
}
