import { Test, TestingModule } from '@nestjs/testing'
import { SquadsController } from './squads.controller'
import { SquadsService } from './squads.service'

describe('SquadsController', () => {
  let controller: SquadsController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SquadsController],
      providers: [
        {
          provide: SquadsService,
          useValue: {}
        }
      ]
    }).compile()

    controller = module.get<SquadsController>(SquadsController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
