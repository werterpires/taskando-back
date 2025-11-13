import { IsNumber } from 'class-validator'

export class DeleteTaskDependencyDto {
  @IsNumber()
  fromTaskId: number

  @IsNumber()
  toTaskId: number
}
