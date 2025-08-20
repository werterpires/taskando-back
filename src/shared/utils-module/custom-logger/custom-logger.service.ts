import { ConsoleLogger, Injectable, Scope } from '@nestjs/common'
import { appendFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

@Injectable({ scope: Scope.TRANSIENT })
export class CustomLoggerService extends ConsoleLogger {
  private logFilePath = join(process.cwd(), 'logs', 'app.log')

  private ensureLogDirectoryExists() {
    const dir = dirname(this.logFilePath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }

  private writeLog(level: string, message: any, trace?: any, context?: string) {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [${level}] ${context ? `{${context}}` : ''} ${message} ${trace ? `\nStacktrace: ${trace}` : ''}\n`

    if (level === 'LOG') {
      console.log(logMessage)
      return
    }

    this.ensureLogDirectoryExists()
    appendFileSync(this.logFilePath, logMessage)
  }

  override log(message: any, context?: string) {
    this.writeLog('LOG', message, undefined, context)
  }

  info(message: any, context?: string) {
    this.writeLog('INFO', message, undefined, context)
  }

  override error(message: any, trace?: any, context?: string) {
    this.writeLog('ERROR', message, trace, context)
  }

  override warn(message: any, context?: string) {
    this.writeLog('WARN', message, undefined, context)
  }

  override debug(message: any) {
    this.writeLog('DEBUG', message)
  }

  override verbose(message: any) {
    this.writeLog('VERBOSE', message)
  }
}
