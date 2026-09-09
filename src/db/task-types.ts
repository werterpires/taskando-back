export const taskTypes = ["simple", "recurring", "commitment", "scheduled", "date", "event", "cyclic", "reminder", "periodic"] as const;
export type TaskType = typeof taskTypes[number];

export type TaskAttribute = "due_date" | "recurrence" | "start_at" | "duration" | "date" | "end_at" | "relevance" | "time" | "periodicity";
export type TaskTypeDefinition = {
  attributes: readonly TaskAttribute[];
  canEnterProcessOrPhase: boolean;
  canHaveSubtasks: boolean;
  canBeSubtask: boolean;
};

export const taskTypeLabels: Record<TaskType, string> = {
  simple: "Simples",
  recurring: "Recorrente",
  commitment: "Compromisso",
  scheduled: "Agendada",
  date: "Data",
  event: "Evento",
  cyclic: "Cíclica",
  reminder: "Lembrete",
  periodic: "Periódica",
};

export const taskTypeMatrix: Readonly<Record<TaskType, TaskTypeDefinition>> = {
  simple: { attributes: ["due_date"], canEnterProcessOrPhase: true, canHaveSubtasks: true, canBeSubtask: true },
  recurring: { attributes: ["due_date", "recurrence"], canEnterProcessOrPhase: false, canHaveSubtasks: true, canBeSubtask: false },
  commitment: { attributes: ["start_at", "duration"], canEnterProcessOrPhase: true, canHaveSubtasks: true, canBeSubtask: true },
  scheduled: { attributes: ["start_at", "duration", "recurrence"], canEnterProcessOrPhase: false, canHaveSubtasks: true, canBeSubtask: false },
  date: { attributes: ["date"], canEnterProcessOrPhase: true, canHaveSubtasks: false, canBeSubtask: true },
  event: { attributes: ["start_at", "end_at"], canEnterProcessOrPhase: true, canHaveSubtasks: false, canBeSubtask: true },
  cyclic: { attributes: ["relevance"], canEnterProcessOrPhase: false, canHaveSubtasks: true, canBeSubtask: false },
  reminder: { attributes: ["date", "time"], canEnterProcessOrPhase: false, canHaveSubtasks: false, canBeSubtask: false },
  periodic: { attributes: ["periodicity"], canEnterProcessOrPhase: false, canHaveSubtasks: true, canBeSubtask: false },
};

export const taskParents = ["organization", "department", "team", "project", "front", "product", "process", "phase"] as const;
export type TaskParentType = typeof taskParents[number];

export function canHaveSubtasks(taskType: TaskType) {
  return taskTypeMatrix[taskType].canHaveSubtasks;
}

export function canBeSubtask(taskType: TaskType) {
  return taskTypeMatrix[taskType].canBeSubtask;
}

export function canAttachTaskType(taskType: TaskType, parentType: TaskParentType | null) {
  return parentType !== "process" && parentType !== "phase" ? true : taskTypeMatrix[taskType].canEnterProcessOrPhase;
}

export function taskTypeError(taskType: string, parentType: TaskParentType | null) {
  if (!taskTypes.includes(taskType as TaskType)) return "Tipo de tarefa inválido.";
  if (!canAttachTaskType(taskType as TaskType, parentType)) return "Este tipo de tarefa não pode entrar em Processo ou Fase.";
  return null;
}

export function commitmentTimeError(taskType: string, startAt?: string | null, durationMinutes?: number | null) {
  if (taskType !== "commitment") return null;
  if (!startAt || Number.isNaN(new Date(startAt).getTime())) return "Informe o início do compromisso.";
  if (typeof durationMinutes !== "number" || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 10080) return "Informe uma duração entre 1 minuto e 7 dias.";
  return null;
}

export function commitmentFitsDueDate(startAt: string, durationMinutes: number, dueDate?: string | null) {
  if (!dueDate) return true;
  return new Date(new Date(startAt).getTime() + durationMinutes * 60_000).toISOString().slice(0, 10) <= dueDate;
}

export function dateMarkerError(taskType: string, dateAt?: string | null) {
  if (taskType !== "date") return null;
  if (!dateAt || !/^\d{4}-\d{2}-\d{2}$/.test(dateAt) || new Date(`${dateAt}T00:00:00.000Z`).toISOString().slice(0, 10) !== dateAt) return "Informe uma data válida para o marco.";
  return null;
}

export function eventTimeError(taskType: string, startAt?: string | null, endAt?: string | null) {
  if (taskType !== "event") return null;
  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;
  if (!startAt || !start || Number.isNaN(start.getTime())) return "Informe o início do evento.";
  if (!endAt || !end || Number.isNaN(end.getTime())) return "Informe o término do evento.";
  if (end.getTime() <= start.getTime()) return "O término do evento deve ser posterior ao início.";
  return null;
}

export function eventFitsDueDate(endAt: string, dueDate?: string | null) {
  if (!dueDate) return true;
  return endAt.slice(0, 10) <= dueDate;
}

/** Base para a liberação de sucessoras quando o grafo de dependências existir. */
export function isDateMarkerReleased(dateAt?: string | null, now = new Date()) {
  return Boolean(dateAt && dateAt <= now.toISOString().slice(0, 10));
}

/** Decisão da fase 22: Eventos liberam sucessoras no horário de término. */
export function isEventReleased(endAt?: string | null, now = new Date()) {
  return Boolean(endAt && new Date(endAt).getTime() <= now.getTime());
}
