export enum status {
  BACKLOG = 'BACKLOG',
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  VALIDATION = 'VALIDATION',
  BLOCKED = 'BLOCKED',
  DONE = 'DONE',
  ARCHIVED = 'ARCHIVED',
  CANCELLED = 'CANCELLED'
}

export const statusArray = [
  status.BACKLOG,
  status.TODO,
  status.IN_PROGRESS,
  status.VALIDATION,
  status.BLOCKED,
  status.DONE,
  status.ARCHIVED,
  status.CANCELLED
]
