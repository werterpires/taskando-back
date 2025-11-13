import { Injectable, BadRequestException } from '@nestjs/common'

@Injectable()
export class CyclesHelper {
  /**
   * Validate cycle parameter time value based on period
   * DAY: HH:MM format
   * WEEK: 0-6 (Sunday-Saturday)
   * MONTH: 1-31 (day of month)
   * YEAR: MM-DD format
   */
  validateParameterTimeValue(period: string, timeValue: string): void {
    switch (period) {
      case 'DAY':
        this.validateTimeFormat(timeValue)
        break
      case 'WEEK':
        this.validateWeekDay(timeValue)
        break
      case 'MONTH':
        this.validateMonthDay(timeValue)
        break
      case 'YEAR':
        this.validateYearDate(timeValue)
        break
      default:
        throw new BadRequestException('Invalid period type')
    }
  }

  private validateTimeFormat(time: string): void {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(time)) {
      throw new BadRequestException(
        'Invalid time format for DAY period. Expected HH:MM (00:00-23:59)'
      )
    }
  }

  private validateWeekDay(day: string): void {
    const dayNumber = parseInt(day, 10)
    if (isNaN(dayNumber) || dayNumber < 0 || dayNumber > 6) {
      throw new BadRequestException(
        'Invalid week day for WEEK period. Expected 0-6 (0=Sunday, 6=Saturday)'
      )
    }
  }

  private validateMonthDay(day: string): void {
    const dayNumber = parseInt(day, 10)
    if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 31) {
      throw new BadRequestException(
        'Invalid day for MONTH period. Expected 1-31'
      )
    }
  }

  private validateYearDate(date: string): void {
    const dateRegex = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/
    if (!dateRegex.test(date)) {
      throw new BadRequestException(
        'Invalid date format for YEAR period. Expected MM-DD (01-01 to 12-31)'
      )
    }
  }
}
