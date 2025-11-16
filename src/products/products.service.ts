import {
  Injectable,
  NotFoundException,
  BadRequestException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { powers } from '../constants/roles.enum'
import { OrganizationMember } from '../organizations-members/entities/organization-member.entity'
import { DepartmentMember } from '../departments/entities/department-member.entity'
import { TeamMember } from '../teams/entities/team-member.entity'
import { SquadMember } from '../squads/entities/squad-member.entity'
import { ProjectMember } from '../projects/entities/project-member.entity'
import { ActivityDomain } from '../activity-domains/entities/activity-domain.entity'
import { Project } from '../projects/entities/project.entity'
import { Stream } from '../streams/entities/stream.entity'
import { ValidateUser } from '../shared/auth/types'
import { Response } from '../shared/types/response.types'
import { Paginator } from '../shared/types/paginator.types'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { Product } from './entities/product.entity'
import { ProductMember } from './entities/product-member.entity'
import { IProduct } from './types'
import { ProductsHelper } from './products.helper'

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductMember)
    private readonly productMemberRepository: Repository<ProductMember>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepository: Repository<OrganizationMember>,
    @InjectRepository(DepartmentMember)
    private readonly departmentMemberRepository: Repository<DepartmentMember>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(SquadMember)
    private readonly squadMemberRepository: Repository<SquadMember>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
    @InjectRepository(ActivityDomain)
    private readonly activityDomainRepository: Repository<ActivityDomain>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Stream)
    private readonly streamRepository: Repository<Stream>,
    private readonly dataSource: DataSource,
    private readonly productsHelper: ProductsHelper
  ) {}

  async create(
    createProductDto: CreateProductDto,
    currentUser: ValidateUser
  ): Promise<IProduct> {
    const {
      orgId,
      deptId,
      teamId,
      squadId,
      projectId,
      streamId,
      activityDomainId
    } = createProductDto

    // Validate single parent (not including activityDomain as parent)
    const parentCount = [
      orgId,
      deptId,
      teamId,
      squadId,
      projectId,
      streamId
    ].filter((id) => id !== undefined && id !== null).length

    if (parentCount > 1) {
      throw new BadRequestException(
        'Product can have only one parent (organization, department, team, squad, project, or stream)'
      )
    }

    // If projectId or streamId is provided, validate and get parent context
    let effectiveOrgId = orgId
    let effectiveDeptId = deptId
    let effectiveTeamId = teamId
    let effectiveSquadId = squadId

    if (streamId) {
      const stream = await this.streamRepository.findOne({
        where: { streamId, streamActive: true },
        relations: ['project']
      })
      if (!stream) {
        throw new NotFoundException('Stream not found')
      }

      // Check permission on stream's project
      const projectMember = await this.projectMemberRepository.findOne({
        where: {
          projectId: stream.projectId,
          userId: currentUser.userId,
          active: true
        }
      })
      if (!projectMember || !projectMember.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add products to this stream'
        )
      }

      // Get parent context from stream's project
      const project =
        stream.project ||
        (await this.projectRepository.findOne({
          where: { projectId: stream.projectId }
        }))
      if (project) {
        effectiveOrgId = project.orgId
        effectiveDeptId = project.deptId
        effectiveTeamId = project.teamId
        effectiveSquadId = project.squadId
      }
    } else if (projectId) {
      const project = await this.projectRepository.findOne({
        where: { projectId, projectActive: true }
      })
      if (!project) {
        throw new NotFoundException('Project not found')
      }

      // Check permission on project
      const projectMember = await this.projectMemberRepository.findOne({
        where: { projectId, userId: currentUser.userId, active: true }
      })
      if (!projectMember || !projectMember.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add products to this project'
        )
      }

      effectiveOrgId = project.orgId
      effectiveDeptId = project.deptId
      effectiveTeamId = project.teamId
      effectiveSquadId = project.squadId
    } else if (orgId) {
      const orgMember = await this.organizationMemberRepository.findOne({
        where: { userId: currentUser.userId, orgId, active: true }
      })
      if (!orgMember || !orgMember.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add products to this organization'
        )
      }
    } else if (deptId) {
      const deptMember = await this.departmentMemberRepository.findOne({
        where: {
          userId: currentUser.userId,
          departmentId: deptId,
          active: true
        }
      })
      if (!deptMember || !deptMember.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add products to this department'
        )
      }
    } else if (teamId) {
      const teamMember = await this.teamMemberRepository.findOne({
        where: { userId: currentUser.userId, teamId, active: true }
      })
      if (!teamMember || !teamMember.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add products to this team'
        )
      }
    } else if (squadId) {
      const squadMember = await this.squadMemberRepository.findOne({
        where: { userId: currentUser.userId, squadId, active: true }
      })
      if (!squadMember || !squadMember.role.includes(powers.addChildren)) {
        throw new BadRequestException(
          'User does not have permission to add products to this squad'
        )
      }
    }

    // Validate activityDomain if provided
    if (activityDomainId) {
      const activityDomain = await this.activityDomainRepository.findOne({
        where: {
          activityDomainId: activityDomainId,
          activityDomainActive: true
        }
      })

      if (!activityDomain) {
        throw new NotFoundException('Activity domain not found')
      }

      // Validate activityDomain belongs to same parent
      if (effectiveOrgId) {
        if (activityDomain.orgId !== effectiveOrgId) {
          throw new BadRequestException(
            'Activity domain must belong to the same organization as the product'
          )
        }
      } else if (effectiveDeptId) {
        if (activityDomain.deptId !== effectiveDeptId) {
          throw new BadRequestException(
            'Activity domain must belong to the same department as the product'
          )
        }
      } else if (effectiveTeamId) {
        if (activityDomain.teamId !== effectiveTeamId) {
          throw new BadRequestException(
            'Activity domain must belong to the same team as the product'
          )
        }
      } else if (effectiveSquadId) {
        if (activityDomain.squadId !== effectiveSquadId) {
          throw new BadRequestException(
            'Activity domain must belong to the same squad as the product'
          )
        }
      } else {
        // Product has no parent - activityDomain must also have no parent
        const activityDomainHasParent = !!(
          activityDomain.orgId ||
          activityDomain.deptId ||
          activityDomain.teamId ||
          activityDomain.squadId
        )
        if (activityDomainHasParent) {
          throw new BadRequestException(
            'Activity domain must have no parent when product has no parent'
          )
        }
      }
    }

    // Create the product with transaction
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const product = this.productRepository.create({
        ...createProductDto,
        productActive: true
      })

      const savedProduct = await queryRunner.manager.save(product)

      // Add creator as member with full powers
      const productMember = this.productMemberRepository.create({
        userId: currentUser.userId,
        productId: savedProduct.productId,
        role: `${powers.view},${powers.editAndDelete},${powers.addChildren}`,
        active: true
      })

      await queryRunner.manager.save(productMember)

      await queryRunner.commitTransaction()

      return {
        productId: savedProduct.productId,
        productName: savedProduct.productName,
        productDescription: savedProduct.productDescription,
        productStartDate: savedProduct.productStartDate,
        productEndDate: savedProduct.productEndDate,
        productStatus: savedProduct.productStatus,
        productDeadline: savedProduct.productDeadline,
        projectId: savedProduct.projectId,
        streamId: savedProduct.streamId,
        orgId: savedProduct.orgId,
        deptId: savedProduct.deptId,
        teamId: savedProduct.teamId,
        squadId: savedProduct.squadId,
        activityDomainId: savedProduct.activityDomainId,
        productActive: savedProduct.productActive,
        userRole: productMember.role
      }
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  async getOne(
    productId: number,
    currentUser: ValidateUser
  ): Promise<IProduct> {
    const product = await this.productRepository
      .createQueryBuilder('product')
      .innerJoin(
        'product_members',
        'member',
        'member.product_id = product.productId AND member.user_id = :userId AND member.active = true',
        { userId: currentUser.userId }
      )
      .where('product.productId = :productId', { productId })
      .andWhere('product.productActive = true')
      .andWhere('member.role LIKE :viewPower', {
        viewPower: `%${powers.view}%`
      })
      .select(['product.*', 'member.role'])
      .getRawOne()

    if (!product) {
      throw new NotFoundException('Product not found or access denied')
    }

    const currentUserMember = await this.productMemberRepository.findOne({
      where: {
        productId: product.productId,
        userId: currentUser.userId,
        active: true
      }
    })

    return {
      productId: product.productId,
      productName: product.productName,
      productDescription: product.productDescription,
      productStartDate: product.productStartDate,
      productEndDate: product.productEndDate,
      productStatus: product.productStatus,
      productDeadline: product.productDeadline,
      projectId: product.projectId,
      streamId: product.streamId,
      orgId: product.orgId,
      deptId: product.deptId,
      teamId: product.teamId,
      squadId: product.squadId,
      activityDomainId: product.activityDomainId,
      productActive: product.productActive,
      userRole: currentUserMember?.role || ''
    }
  }

  async getAll(
    paginator: Paginator<Product>,
    currentUser: ValidateUser
  ): Promise<Response<Product, IProduct>> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'productName',
      direction = 'ASC',
      filters = []
    } = paginator

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .innerJoin(
        'product_members',
        'member',
        'member.product_id = product.productId AND member.user_id = :userId AND member.active = true',
        { userId: currentUser.userId }
      )
      .where('product.productActive = true')
      .andWhere('member.role LIKE :viewPower', {
        viewPower: `%${powers.view}%`
      })

    // Apply filters
    filters.forEach((filter) => {
      if (filter.value !== undefined && filter.value !== null) {
        queryBuilder.andWhere(`product.${filter.field} = :${filter.field}`, {
          [filter.field]: filter.value
        })
      }
    })

    const products = await queryBuilder
      .orderBy(`product.${orderBy}`, direction)
      .skip(offset)
      .take(limit)
      .select(['product.*', 'member.role'])
      .getRawMany()

    const productsWithUserRoles = products.map((product) => ({
      productId: product.productId,
      productName: product.productName,
      productDescription: product.productDescription,
      productStartDate: product.productStartDate,
      productEndDate: product.productEndDate,
      productStatus: product.productStatus,
      productDeadline: product.productDeadline,
      projectId: product.projectId,
      streamId: product.streamId,
      orgId: product.orgId,
      deptId: product.deptId,
      teamId: product.teamId,
      squadId: product.squadId,
      activityDomainId: product.activityDomainId,
      productActive: product.productActive,
      userRole: product.role
    }))

    return {
      paginator: paginator,
      itens: productsWithUserRoles
    }
  }

  async update(
    updateProductDto: UpdateProductDto,
    currentUser: ValidateUser
  ): Promise<IProduct> {
    const { productId, activityDomainId } = updateProductDto

    // Check if user has edit permission
    const member = await this.productMemberRepository.findOne({
      where: {
        productId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (!member || !member.role.includes(powers.editAndDelete)) {
      throw new BadRequestException(
        'User does not have permission to edit this product'
      )
    }

    const product = await this.productRepository.findOne({
      where: { productId, productActive: true }
    })

    if (!product) {
      throw new NotFoundException('Product not found')
    }

    // Validate activityDomain if being updated
    if (activityDomainId !== undefined) {
      if (activityDomainId === null) {
        product.activityDomainId = undefined
      } else {
        const activityDomain = await this.activityDomainRepository.findOne({
          where: {
            activityDomainId: activityDomainId,
            activityDomainActive: true
          }
        })

        if (!activityDomain) {
          throw new NotFoundException('Activity domain not found')
        }

        // Get the parent from DTO or existing product
        const orgId = updateProductDto.orgId ?? product.orgId
        const deptId = updateProductDto.deptId ?? product.deptId
        const teamId = updateProductDto.teamId ?? product.teamId
        const squadId = updateProductDto.squadId ?? product.squadId
        const projectId = updateProductDto.projectId ?? product.projectId
        const streamId = updateProductDto.streamId ?? product.streamId

        // Determine effective parent
        let effectiveOrgId = orgId
        let effectiveDeptId = deptId
        let effectiveTeamId = teamId
        let effectiveSquadId = squadId

        if (streamId) {
          const stream = await this.streamRepository.findOne({
            where: { streamId },
            relations: ['project']
          })
          if (stream?.project) {
            effectiveOrgId = stream.project.orgId
            effectiveDeptId = stream.project.deptId
            effectiveTeamId = stream.project.teamId
            effectiveSquadId = stream.project.squadId
          }
        } else if (projectId) {
          const proj = await this.projectRepository.findOne({
            where: { projectId }
          })
          if (proj) {
            effectiveOrgId = proj.orgId
            effectiveDeptId = proj.deptId
            effectiveTeamId = proj.teamId
            effectiveSquadId = proj.squadId
          }
        }

        // Validate activityDomain belongs to same parent
        if (effectiveOrgId) {
          if (activityDomain.orgId !== effectiveOrgId) {
            throw new BadRequestException(
              'Activity domain must belong to the same organization as the product'
            )
          }
        } else if (effectiveDeptId) {
          if (activityDomain.deptId !== effectiveDeptId) {
            throw new BadRequestException(
              'Activity domain must belong to the same department as the product'
            )
          }
        } else if (effectiveTeamId) {
          if (activityDomain.teamId !== effectiveTeamId) {
            throw new BadRequestException(
              'Activity domain must belong to the same team as the product'
            )
          }
        } else if (effectiveSquadId) {
          if (activityDomain.squadId !== effectiveSquadId) {
            throw new BadRequestException(
              'Activity domain must belong to the same squad as the product'
            )
          }
        } else {
          const activityDomainHasParent = !!(
            activityDomain.orgId ||
            activityDomain.deptId ||
            activityDomain.teamId ||
            activityDomain.squadId
          )
          if (activityDomainHasParent) {
            throw new BadRequestException(
              'Activity domain must have no parent when product has no parent'
            )
          }
        }
      }
    }

    // Validate single parent if being updated
    const orgId = updateProductDto.orgId ?? product.orgId
    const deptId = updateProductDto.deptId ?? product.deptId
    const teamId = updateProductDto.teamId ?? product.teamId
    const squadId = updateProductDto.squadId ?? product.squadId
    const projectId = updateProductDto.projectId ?? product.projectId
    const streamId = updateProductDto.streamId ?? product.streamId

    const parentCount = [
      orgId,
      deptId,
      teamId,
      squadId,
      projectId,
      streamId
    ].filter((id) => id !== undefined && id !== null).length

    if (parentCount > 1) {
      throw new BadRequestException(
        'Product can have only one parent (organization, department, team, squad, project, or stream)'
      )
    }

    Object.assign(product, updateProductDto)
    const updatedProduct = await this.productRepository.save(product)

    return {
      productId: updatedProduct.productId,
      productName: updatedProduct.productName,
      productDescription: updatedProduct.productDescription,
      productStartDate: updatedProduct.productStartDate,
      productEndDate: updatedProduct.productEndDate,
      productStatus: updatedProduct.productStatus,
      productDeadline: updatedProduct.productDeadline,
      projectId: updatedProduct.projectId,
      streamId: updatedProduct.streamId,
      orgId: updatedProduct.orgId,
      deptId: updatedProduct.deptId,
      teamId: updatedProduct.teamId,
      squadId: updatedProduct.squadId,
      activityDomainId: updatedProduct.activityDomainId,
      productActive: updatedProduct.productActive,
      userRole: member.role
    }
  }

  async delete(productId: number, currentUser: ValidateUser): Promise<void> {
    const member = await this.productMemberRepository.findOne({
      where: {
        productId,
        userId: currentUser.userId,
        active: true
      }
    })

    if (!member || !member.role.includes(powers.editAndDelete)) {
      throw new BadRequestException(
        'User does not have permission to delete this product'
      )
    }

    const product = await this.productRepository.findOne({
      where: { productId, productActive: true }
    })

    if (!product) {
      throw new NotFoundException('Product not found')
    }

    // Soft delete
    product.productActive = false
    await this.productRepository.save(product)
  }
}
