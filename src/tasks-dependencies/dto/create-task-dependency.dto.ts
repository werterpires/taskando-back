import { IsNumber } from 'class-validator'

export class CreateTaskDependencyDto {
  @IsNumber()
  fromTaskId: number

  @IsNumber()
  toTaskId: number
}
