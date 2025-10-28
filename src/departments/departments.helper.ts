import { Injectable } from '@nestjs/common'
import { CreateDepartmentDto } from './dto/create-department.dto'
import { UpdateDepartmentDto } from './dto/update-department.dto'
import { CreateDepartmentData } from './types'
import { ValidateUser } from '../shared/auth/types'

@Injectable()
export class DepartmentsHelper {
  makeCreateDepartmentDataFromDto(
    createDepartmentDto: CreateDepartmentDto,
    currentUser: ValidateUser
  ): CreateDepartmentData {
    return {
      name: createDepartmentDto.name,
      ownerId: currentUser.userId,
      orgId: createDepartmentDto.orgId
    }
  }

  makeUpdateDepartmentDataFromDto(
    updateDepartmentDto: UpdateDepartmentDto
  ): Partial<CreateDepartmentData> {
    const updateData: Partial<CreateDepartmentData> = {}

    if (updateDepartmentDto.name !== undefined) {
      updateData.name = updateDepartmentDto.name
    }
    return updateData
  }
}
