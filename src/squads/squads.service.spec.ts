import { Test, TestingModule } from '@nestjs/testing'
import { SquadsService } from './squads.service'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { Squad } from './entities/squad.entity'
import { SquadMember } from './entities/squad-member.entity'
import { OrganizationMember } from '../organizations-members/entities/organization-member.entity'
import { DepartmentMember } from '../departments/entities/department-member.entity'
import { TeamMember } from '../teams/entities/team-member.entity'
import { SquadsHelper } from './squads.helper'

describe('SquadsService', () => {
  let service: SquadsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SquadsService,
        SquadsHelper,
        {
          provide: getRepositoryToken(Squad),
          useValue: {}
        },
        {
          provide: getRepositoryToken(SquadMember),
          useValue: {}
        },
        {
          provide: getRepositoryToken(OrganizationMember),
          useValue: {}
        },
        {
          provide: getRepositoryToken(DepartmentMember),
          useValue: {}
        },
        {
          provide: getRepositoryToken(TeamMember),
          useValue: {}
        },
        {
          provide: DataSource,
          useValue: {}
        }
      ]
    }).compile()

    service = module.get<SquadsService>(SquadsService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
