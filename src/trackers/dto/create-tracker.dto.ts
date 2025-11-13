import { IsNumber, IsOptional, IsString, ValidateIf } from 'class-validator'

export class CreateTrackerDto {
  @IsString()
  startAt: string

  @IsOptional()
  @IsNumber()
  @ValidateIf(
    (o) =>
      !o.streamId && !o.productId && !o.processId && !o.phaseId && !o.taskId
  )
  projectId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf(
    (o) =>
      !o.projectId && !o.productId && !o.processId && !o.phaseId && !o.taskId
  )
  streamId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf(
    (o) =>
      !o.projectId && !o.streamId && !o.processId && !o.phaseId && !o.taskId
  )
  productId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf(
    (o) =>
      !o.projectId && !o.streamId && !o.productId && !o.phaseId && !o.taskId
  )
  processId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf(
    (o) =>
      !o.projectId && !o.streamId && !o.productId && !o.processId && !o.taskId
  )
  phaseId?: number

  @IsOptional()
  @IsNumber()
  @ValidateIf(
    (o) =>
      !o.projectId && !o.streamId && !o.productId && !o.processId && !o.phaseId
  )
  taskId?: number
}
