import { PartialType } from '@nestjs/mapped-types'
import { CreateStreamDto } from './create-stream.dto'
import { IsNumber } from 'class-validator'

export class UpdateStreamDto extends PartialType(CreateStreamDto) {
  @IsNumber()
  streamId: number
}
