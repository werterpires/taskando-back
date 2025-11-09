import { Test, TestingModule } from '@nestjs/testing'
import { ActivityDomainsService } from './activity-domains.service'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { ActivityDomain } from './entities/activity-domain.entity'
import { OrganizationMember } from '../organizations-members/entities/organization-member.entity'
import { DepartmentMember } from '../departments/entities/department-member.entity'
import { TeamMember } from '../teams/entities/team-member.entity'
import { SquadMember } from '../squads/entities/squad-member.entity'
import { ActivityDomainsHelper } from './activity-domains.helper'

describe('ActivityDomainsService', () => {
  let service: ActivityDomainsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityDomainsService,
        ActivityDomainsHelper,
        {
          provide: getRepositoryToken(ActivityDomain),
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
          provide: getRepositoryToken(SquadMember),
          useValue: {}
        },
        {
          provide: DataSource,
          useValue: {}
        }
      ]
    }).compile()

    service = module.get<ActivityDomainsService>(ActivityDomainsService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
