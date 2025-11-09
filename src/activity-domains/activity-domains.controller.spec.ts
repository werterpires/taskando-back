import { Test, TestingModule } from '@nestjs/testing'
import { ActivityDomainsController } from './activity-domains.controller'
import { ActivityDomainsService } from './activity-domains.service'

describe('ActivityDomainsController', () => {
  let controller: ActivityDomainsController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityDomainsController],
      providers: [
        {
          provide: ActivityDomainsService,
          useValue: {}
        }
      ]
    }).compile()

    controller = module.get<ActivityDomainsController>(
      ActivityDomainsController
    )
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
