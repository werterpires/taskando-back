import { Test, TestingModule } from '@nestjs/testing'
import { PhasesDependenciesController } from './phases-dependencies.controller'

describe('PhasesDependenciesController', () => {
  let controller: PhasesDependenciesController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PhasesDependenciesController]
    }).compile()

    controller = module.get<PhasesDependenciesController>(
      PhasesDependenciesController
    )
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
