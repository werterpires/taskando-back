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
  Query
} from '@nestjs/common'
import { ValidateUser } from '../shared/auth/types'
import { CurrentUser } from 'src/users/decorators/current-user.decorator'
import { CreateDepartmentDto } from './dto/create-department.dto'
import { UpdateDepartmentDto } from './dto/update-department.dto'
import { Department } from './entities/department.entity'
import { DepartmentsService } from './departments.service'
import { Paginator } from 'src/shared/types/paginator.types'

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  async getAll(
    @Query() query: Paginator<Department>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.departmentsService.getAll(query, currentUser)
  }

  @Get('organization/:orgId')
  async getAllByOrgId(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Query() query: Paginator<Department>,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.departmentsService.getAllByOrgId(
      orgId,
      query,
      currentUser
    )
  }

  @Get(':id')
  async getOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return await this.departmentsService.getOne(id, currentUser)
  }

  @Put()
  async update(
    @Body() updateDepartmentDto: UpdateDepartmentDto,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.departmentsService.update(updateDepartmentDto, currentUser)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: ValidateUser
  ) {
    await this.departmentsService.delete(id, currentUser)
  }

  @Post()
  async create(
    @Body() createDepartmentDto: CreateDepartmentDto,
    @CurrentUser() currentUser: ValidateUser
  ) {
    return this.departmentsService.create(createDepartmentDto, currentUser)
  }
}
