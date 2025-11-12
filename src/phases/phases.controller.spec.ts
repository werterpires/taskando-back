import { Test, TestingModule } from '@nestjs/testing'
import { PhasesController } from './phases.controller'

describe('PhasesController', () => {
  let controller: PhasesController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PhasesController]
    }).compile()

    controller = module.get<PhasesController>(PhasesController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
