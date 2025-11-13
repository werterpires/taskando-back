import { Test, TestingModule } from '@nestjs/testing'
import { PhasesDependenciesService } from './phases-dependencies.service'

describe('PhasesDependenciesService', () => {
  let service: PhasesDependenciesService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PhasesDependenciesService]
    }).compile()

    service = module.get<PhasesDependenciesService>(PhasesDependenciesService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
