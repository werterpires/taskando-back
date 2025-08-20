import { Test, TestingModule } from '@nestjs/testing'
import { CustomErrorHandlerService } from '../custom-error-handler.service'
import { CustomLoggerService } from '../../utils-module/custom-logger/custom-logger.service'
import { defaultError } from '../custom-error-handler.service'

describe('CustomErrorHandlerService', () => {
  let service: CustomErrorHandlerService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomErrorHandlerService,
        {
          provide: CustomLoggerService,
          useValue: {
            error: jest.fn(),
            setContext: jest.fn()
          }
        }
      ]
    }).compile()

    service = module.get<CustomErrorHandlerService>(CustomErrorHandlerService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should handle errors started with a #', () => {
    const error = new Error('#Error message')

    const result = service.handleErrors(error)

    expect(result).toEqual(error)
  })

  it('should handle internal errors', () => {
    const error = new Error('Internal error')

    const result = service.handleErrors(error)

    expect(result.message).toEqual(defaultError)
  })
})
