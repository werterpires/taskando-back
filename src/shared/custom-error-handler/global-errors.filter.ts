import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from '@nestjs/common'

import { Request, Response } from 'express'
import { CustomErrorHandlerService } from './custom-error-handler.service'
import { CustomLoggerService } from '../utils-module/custom-logger/custom-logger.service'
import { v4 as uuidv4 } from 'uuid'

@Catch()
export class GlobalErrorsFilter implements ExceptionFilter {
  constructor(
    private readonly errorsService: CustomErrorHandlerService,
    private readonly logger: CustomLoggerService
  ) {
    this.logger.setContext(GlobalErrorsFilter.name)
  }
  catch(exception: Error, host: ArgumentsHost) {
    const uniqueId = uuidv4()
    this.logger.error(`[${uniqueId}] ${exception.message}`, exception.stack)

    const isHttpException = exception instanceof HttpException
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    let errorResponse: string | object

    if (isHttpException && exception.message.startsWith('#')) {
      errorResponse = exception.getResponse()
    } else {
      errorResponse = this.errorsService.handleErrors(exception, uniqueId)
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: errorResponse || 'internal server error bonitão'
    })
  }
}
