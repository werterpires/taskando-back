import { IsNumber } from 'class-validator'
import { CreateProcessDto } from './create-process.dto'

export class UpdateProcessDto extends CreateProcessDto {
  @IsNumber()
  processId: number
}
