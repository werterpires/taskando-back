/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import { Response, Request } from 'express'
import { GlobalErrorsFilter } from '../global-errors.filter'
import { CustomErrorHandlerService } from '../custom-error-handler.service'
import { CustomLoggerService } from '../../utils-module/custom-logger/custom-logger.service'

describe('GlobalErrorsFilter', () => {
  let filter: GlobalErrorsFilter
  let mockErrorsService: CustomErrorHandlerService
  let mockLoggerService: jest.Mocked<CustomLoggerService>
  let mockArgumentsHost: ArgumentsHost
  let mockResponse: Partial<Response>
  let mockRequest: Partial<Request>

  beforeEach(() => {
    mockErrorsService = {
      handleErrors: jest.fn((error) => ({
        customErrorCode: 'CUSTOM_ERROR',
        message: error.message
      }))
    } as any

    mockLoggerService = {
      setContext: jest.fn(),
      error: jest.fn()
    } as any

    filter = new GlobalErrorsFilter(mockErrorsService, mockLoggerService)

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }

    mockRequest = {
      url: '/api/test'
    }

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest)
      }),
      getType: jest.fn().mockReturnValue('http')
    } as any
  })

  it('should be defined', () => {
    expect(filter).toBeDefined()
  })

  it('should log the error message and stack', () => {
    const error = new Error('Test error')
    filter.catch(error, mockArgumentsHost)
    expect(mockLoggerService.error).toHaveBeenCalledWith(
      error.message,
      error.stack
    )
  })

  describe('when the exception is an HttpException', () => {
    it('should respond with the HttpException status and response', () => {
      const httpException = new HttpException(
        { message: 'HTTP Error', statusCode: HttpStatus.BAD_REQUEST },
        HttpStatus.BAD_REQUEST
      )
      filter.catch(httpException, mockArgumentsHost)
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: expect.any(String),
        path: '/api/test',
        error: { message: 'HTTP Error', statusCode: HttpStatus.BAD_REQUEST }
      })
    })
  })

  describe('when the exception is not an HttpException', () => {
    it('should respond with INTERNAL_SERVER_ERROR and the custom error response', () => {
      const error = new Error('Non-HTTP error')
      filter.catch(error, mockArgumentsHost)
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR
      )
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String),
        path: '/api/test',
        error: { customErrorCode: 'CUSTOM_ERROR', message: 'Non-HTTP error' }
      })
      expect(mockErrorsService.handleErrors).toHaveBeenCalledWith(error)
    })

    it('should respond with the default internal server error message if errorsService.handleErrors returns undefined', () => {
      ;(mockErrorsService.handleErrors as jest.Mock).mockReturnValue(undefined)
      const error = new Error('Another non-HTTP error')
      filter.catch(error, mockArgumentsHost)
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String),
        path: '/api/test',
        error: 'internal server error bonitão'
      })
    })
  })
})
