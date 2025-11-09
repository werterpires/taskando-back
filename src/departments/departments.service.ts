import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { powers, userRoleEnum } from '../constants/roles.enum'
import { OrganizationMember } from '../organizations-members/entities/organization-member.entity'
import { ValidateUser } from '../shared/auth/types'
import { Response } from '../shared/types/response.types'
import { Paginator } from '../shared/types/paginator.types'
import { CreateDepartmentDto } from './dto/create-department.dto'
import { UpdateDepartmentDto } from './dto/update-department.dto'
import { Department } from './entities/department.entity'
import { DepartmentMember } from './entities/department-member.entity'
import { IDepartment } from './types'

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(DepartmentMember)
    private readonly departmentMemberRepository: Repository<DepartmentMember>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepository: Repository<OrganizationMember>,
    private readonly dataSource: DataSource
  ) {}

  async getOne(
    deptId: number,
    currentUser: ValidateUser
  ): Promise<IDepartment> {
    // Check if user has view power for this department
    const department = await this.departmentRepository
      .createQueryBuilder('dept')
      .innerJoin(
        'dept.deptMembers',
        'member',
        'member.userId = :userId AND member.active = true',
        { userId: currentUser.userId }
      )
      .where('dept.deptId = :deptId', { deptId })
      .andWhere('member.role LIKE :viewPower', {
        viewPower: `%${powers.view}%`
      })
      .select(['dept', 'member.role'])
      .getOne()

    if (!department) {
      throw new NotFoundException('Department not found or access denied')
    }

    // Get current user member info
    const currentUserMember = await this.departmentMemberRepository.findOne({
      where: {
        departmentId: department.deptId,
        userId: currentUser.userId,
        active: true
      }
    })

    return {
      ...department,
      currentUserRoles: currentUserMember?.role || ''
    } as IDepartment
  }

  async getAll(
    paginator: Paginator<Department>,
    currentUser: ValidateUser
  ): Promise<Response<Department, IDepartment>> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'deptName',
      direction = 'ASC',
      filters = []
    } = paginator

    // Build the query to get departments where user is member with view power
    const queryBuilder = this.departmentRepository
      .createQueryBuilder('dept')
      .innerJoin(
        'dept.deptMembers',
        'member',
        'member.userId = :userId AND member.active = true',
        { userId: currentUser.userId }
      )
      .where('member.role LIKE :viewPower', { viewPower: `%${powers.view}%` })

    // Apply filters
    filters.forEach((filter) => {
      const { filterType, field, value } = filter
      if (filterType && field && value !== undefined) {
        switch (filterType) {
          case 'like':
            queryBuilder.andWhere(`dept.${field} LIKE :${field}`, {
              [field]: `%${value}%`
            })
            break
          case 'equal':
            queryBuilder.andWhere(`dept.${field} = :${field}`, {
              [field]: value
            })
            break
          case 'moreThan':
            queryBuilder.andWhere(`dept.${field} > :${field}`, {
              [field]: value
            })
            break
          case 'lessThan':
            queryBuilder.andWhere(`dept.${field} < :${field}`, {
              [field]: value
            })
            break
        }
      }
    })

    // Get total count
    const totalItems = await queryBuilder.getCount()

    // Apply pagination and ordering - now select member role too
    const departmentsWithRoles = await queryBuilder
      .select(['dept', 'member.role'])
      .orderBy(`dept.${orderBy}`, direction)
      .skip(offset)
      .take(limit)
      .getMany()

    // Get current user role for each department
    const departmentsWithUserRoles = await Promise.all(
      departmentsWithRoles.map(async (dept) => {
        const currentUserMember = await this.departmentMemberRepository.findOne(
          {
            where: {
              departmentId: dept.deptId,
              userId: currentUser.userId,
              active: true
            }
          }
        )

        return {
          ...dept,
          currentUserRoles: currentUserMember?.role || ''
        } as IDepartment
      })
    )

    // Build paginator
    const paginatory: Paginator<Department> = {
      limit,
      offset,
      orderBy,
      direction,
      filters,
      totalItems
    }

    return {
      paginator: paginatory,
      itens: departmentsWithUserRoles
    }
  }

  async getAllByOrgId(
    orgId: number,
    paginator: Paginator<Department>,
    currentUser: ValidateUser
  ): Promise<Response<Department, IDepartment>> {
    // First, check if user has seeChildren power in the organization
    const organizationMember = await this.organizationMemberRepository.findOne({
      where: {
        orgId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (
      !organizationMember ||
      !organizationMember.role.includes(powers.seeChildren)
    ) {
      throw new NotFoundException(
        'Organization not found or insufficient permissions to see departments'
      )
    }

    const {
      limit = 20,
      offset = 0,
      orderBy = 'deptName',
      direction = 'ASC',
      filters = []
    } = paginator

    // Build the query to get departments of the specified organization
    const queryBuilder = this.departmentRepository
      .createQueryBuilder('dept')
      .where('dept.orgId = :orgId', { orgId })
      .andWhere('dept.deptActive = :active', { active: true })

    // Apply filters
    filters.forEach((filter) => {
      const { filterType, field, value } = filter
      if (filterType && field && value !== undefined) {
        switch (filterType) {
          case 'like':
            queryBuilder.andWhere(`dept.${field} LIKE :${field}`, {
              [field]: `%${value}%`
            })
            break
          case 'equal':
            queryBuilder.andWhere(`dept.${field} = :${field}`, {
              [field]: value
            })
            break
          case 'moreThan':
            queryBuilder.andWhere(`dept.${field} > :${field}`, {
              [field]: value
            })
            break
          case 'lessThan':
            queryBuilder.andWhere(`dept.${field} < :${field}`, {
              [field]: value
            })
            break
        }
      }
    })

    // Get total count
    const totalItems = await queryBuilder.getCount()

    // Apply pagination and ordering
    const departments = await queryBuilder
      .orderBy(`dept.${orderBy}`, direction)
      .skip(offset)
      .take(limit)
      .getMany()

    // Get current user role for each department (if user is member)
    const departmentsWithUserRoles = await Promise.all(
      departments.map(async (dept) => {
        const currentUserMember = await this.departmentMemberRepository.findOne(
          {
            where: {
              departmentId: dept.deptId,
              userId: currentUser.userId,
              active: true
            }
          }
        )

        return {
          ...dept,
          currentUserRoles: currentUserMember?.role || ''
        } as IDepartment
      })
    )

    // Build paginator
    const paginatory: Paginator<Department> = {
      limit,
      offset,
      orderBy,
      direction,
      filters,
      totalItems
    }

    return {
      paginator: paginatory,
      itens: departmentsWithUserRoles
    }
  }

  async update(
    updateDepartmentDto: UpdateDepartmentDto,
    currentUser: ValidateUser
  ): Promise<Department> {
    // Check if user has editAndDelete power for this department
    const departmentMember = await this.departmentMemberRepository.findOne({
      where: {
        departmentId: updateDepartmentDto.deptId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (
      !departmentMember ||
      !departmentMember.role.includes(powers.editAndDelete)
    ) {
      throw new NotFoundException(
        'Department not found or insufficient permissions'
      )
    }

    // Use preload to load existing entity and apply changes in one go
    const departmentToUpdate = await this.departmentRepository.preload({
      ...updateDepartmentDto
    })

    if (!departmentToUpdate || !departmentToUpdate.deptActive) {
      throw new NotFoundException('Department not found')
    }

    // Save the updated department
    return await this.departmentRepository.save(departmentToUpdate)
  }

  async delete(deptId: number, currentUser: ValidateUser): Promise<void> {
    // Check if user has editAndDelete power for this department
    const departmentMember = await this.departmentMemberRepository.findOne({
      where: {
        departmentId: deptId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (
      !departmentMember ||
      !departmentMember.role.includes(powers.editAndDelete)
    ) {
      throw new NotFoundException(
        'Department not found or insufficient permissions'
      )
    }

    // Check if department exists and is active
    const department = await this.departmentRepository.findOne({
      where: { deptId, deptActive: true }
    })

    if (!department) {
      throw new NotFoundException('Department not found')
    }

    // Soft delete by setting deptActive to false
    await this.departmentRepository.update(deptId, { deptActive: false })
  }

  async create(
    createDepartmentDto: CreateDepartmentDto,
    currentUser: ValidateUser
  ): Promise<Department> {
    return await this.dataSource.transaction(async (manager) => {
      // If orgId is provided, check if user has permission in that organization
      if (createDepartmentDto.orgId) {
        const organizationMember =
          await this.organizationMemberRepository.findOne({
            where: {
              orgId: createDepartmentDto.orgId,
              userId: currentUser.userId,
              active: true
            }
          })

        if (
          !organizationMember ||
          !organizationMember.role.includes(powers.addChildren)
        ) {
          throw new NotFoundException(
            'Organization not found or insufficient permissions to create department'
          )
        }
      }

      // Create the department
      const department = manager.create(Department, {
        ...createDepartmentDto,
        deptActive: true
      })

      const savedDepartment = await manager.save(Department, department)

      // Create the department member with OWNER role
      const departmentMember = manager.create(DepartmentMember, {
        userId: currentUser.userId,
        departmentId: savedDepartment.deptId,
        role: userRoleEnum.OWNER,
        active: true
      })

      await manager.save(DepartmentMember, departmentMember)

      return savedDepartment
    })
  }
}
