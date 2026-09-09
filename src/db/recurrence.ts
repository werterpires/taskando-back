import { asc, eq } from "drizzle-orm";
import { auditEvents, hierarchyAttachments, itemRoleAssignments, recurrenceOccurrences, recurrenceSeries, taskAssignees, tasks } from "./schema";
import type { ensurePersonalContext } from "./current-user";
import type { TaskParentType } from "./task-types";
import { defaultTimeZone, isValidTimeZone } from "./time-zone";

type RecurrenceContext = NonNullable<Awaited<ReturnType<typeof ensurePersonalContext>>>;

export const recurrenceTaskTypes = ["recurring", "scheduled", "periodic"] as const;
export const recurrenceCadences = ["day", "week", "month", "year"] as const;
export type RecurrenceTaskType = typeof recurrenceTaskTypes[number];
export type RecurrenceCadence = typeof recurrenceCadences[number];

export type RecurrenceDefinition = {
  version: 1;
  cadence: RecurrenceCadence;
  interval: number;
  startDate: string;
  endDate?: string | null;
  time: string;
  timeZone: string;
  weekdays?: number[];
  dayOfMonth?: number | null;
  durationMinutes?: number | null;
  occurrencesPerPeriod?: number;
  periodSlots?: (number | string)[];
  keyMode: "instant" | "period";
};

export type RecurrenceSeriesInput = {
  title: string;
  description?: string;
  taskType: RecurrenceTaskType;
  definition: RecurrenceDefinition;
  parentType: TaskParentType | null;
  parentId: string | null;
  organizationId: string | null;
};

export async function createRecurrenceSeries(context: RecurrenceContext, input: RecurrenceSeriesInput) {
  const [series] = await context.db.insert(recurrenceSeries).values({
    id: crypto.randomUUID(), personalSpaceId: context.space.id, organizationId: input.organizationId,
    ownerUserId: context.user.id, authorUserId: context.user.id, title: input.title,
    description: input.description?.trim() ?? "", taskType: input.taskType,
    parentType: input.parentType, parentId: input.parentId,
    definitionJson: JSON.stringify(input.definition), active: true,
  }).returning();
  return series;
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const validDate = (value: string) => datePattern.test(value) && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()) && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
const validAnnualSlot = (value: string) => { if (!/^\d{2}-\d{2}$/.test(value)) return false; const [month, day] = value.split("-").map(Number); const date = new Date(Date.UTC(2021, month - 1, day)); return date.toISOString().slice(5, 10) === value; };
const utcDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const dateKey = (value: Date) => value.toISOString().slice(0, 10);
const addDays = (value: Date, days: number) => { const next = new Date(value); next.setUTCDate(next.getUTCDate() + days); return next; };
const addMonths = (value: Date, months: number) => { const next = new Date(value); next.setUTCMonth(next.getUTCMonth() + months); return next; };
export const recurrenceHorizonMonths = 12;
const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
const isoWeekday = (value: Date) => value.getUTCDay() || 7;
const startOfWeek = (value: Date) => addDays(value, 1 - isoWeekday(value));
const periodKeyFor = (value: Date, cadence: RecurrenceCadence) => cadence === "year" ? `${value.getUTCFullYear()}` : cadence === "month" ? value.toISOString().slice(0, 7) : cadence === "week" ? dateKey(startOfWeek(value)) : dateKey(value);
const atTime = (day: Date, time: string, timeZone: string) => {
  const [hour, minute] = time.split(":").map(Number);
  const target = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, minute);
  let guess = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(guess));
    const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
    const displayed = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute);
    guess = target - (displayed - guess);
  }
  return new Date(guess);
};

export function recurrenceWindowError(from?: string, to?: string) {
  if (!from || !to || !validDate(from) || !validDate(to) || from > to) return "Informe um intervalo de materialização válido.";
  const horizonEnd = dateKey(addMonths(utcDate(from), recurrenceHorizonMonths));
  if (to > horizonEnd) return `A janela de materialização deve ter no máximo ${recurrenceHorizonMonths} meses.`;
  return null;
}

export function parseRecurrenceDefinition(input: unknown, taskType: string): { definition?: RecurrenceDefinition; error?: string } {
  if (!recurrenceTaskTypes.includes(taskType as RecurrenceTaskType)) return { error: "Somente tarefas Recorrentes, Agendadas ou Periódicas possuem série." };
  if (!input || typeof input !== "object") return { error: "Informe a definição da série." };
  const raw = input as Record<string, unknown>;
  const cadence = raw.cadence;
  const interval = Number(raw.interval ?? 1);
  const startDate = String(raw.startDate ?? "");
  const endDate = raw.endDate ? String(raw.endDate) : null;
  const time = String(raw.time ?? "09:00");
  const timeZone = String(raw.timeZone ?? "America/Sao_Paulo");
  if (!recurrenceCadences.includes(cadence as RecurrenceCadence)) return { error: "Escolha uma frequência válida." };
  if (!Number.isInteger(interval) || interval < 1 || interval > 365) return { error: "O intervalo deve ser um número inteiro entre 1 e 365." };
  if (!validDate(startDate)) return { error: "Informe uma data inicial válida para a série." };
  if (endDate && (!validDate(endDate) || endDate < startDate)) return { error: "A data final deve ser válida e não pode anteceder a inicial." };
  if (!timePattern.test(time)) return { error: "Informe um horário válido no formato HH:MM." };
  if (!isValidTimeZone(timeZone)) return { error: "Informe um fuso horário IANA válido para a série." };
  const weekdays = Array.isArray(raw.weekdays) ? [...new Set(raw.weekdays.map(Number))].sort((a, b) => a - b) : undefined;
  if (weekdays?.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) return { error: "Os dias da semana devem estar entre segunda e domingo." };
  const dayOfMonth = raw.dayOfMonth === undefined || raw.dayOfMonth === null || raw.dayOfMonth === "" ? null : Number(raw.dayOfMonth);
  if (dayOfMonth !== null && (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31)) return { error: "O dia do mês deve estar entre 1 e 31." };
  const durationMinutes = raw.durationMinutes === undefined || raw.durationMinutes === null || raw.durationMinutes === "" ? null : Number(raw.durationMinutes);
  if (taskType === "scheduled" && (durationMinutes === null || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 10080)) return { error: "Informe uma duração entre 1 minuto e 7 dias para a série agendada." };
  if (durationMinutes !== null && (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 10080)) return { error: "A duração deve estar entre 1 minuto e 7 dias." };
  if (taskType === "periodic") {
    if (cadence !== "week" && cadence !== "month" && cadence !== "year") return { error: "A tarefa Periódica deve usar semana, mês ou ano como período." };
    const occurrencesPerPeriod = Number(raw.occurrencesPerPeriod ?? raw.interval ?? 1);
    if (!Number.isInteger(occurrencesPerPeriod) || occurrencesPerPeriod < 1 || occurrencesPerPeriod > 31) return { error: "Informe entre 1 e 31 ocorrências por período." };
    const rawSlots = raw.periodSlots;
    const slots = Array.isArray(rawSlots) ? rawSlots.map((slot) => typeof slot === "string" ? slot.trim() : Number(slot)).filter((slot) => slot !== "") : cadence === "week" ? (weekdays?.length ? weekdays : [isoWeekday(utcDate(startDate))]) : cadence === "month" ? [dayOfMonth ?? 1] : [`01-${String(dayOfMonth ?? 1).padStart(2, "0")}`];
    if (slots.length !== occurrencesPerPeriod) return { error: `Selecione exatamente ${occurrencesPerPeriod} data${occurrencesPerPeriod === 1 ? "" : "s"} para cada período.` };
    if (new Set(slots.map(String)).size !== slots.length) return { error: "As posições do período não podem se repetir." };
    if (cadence === "week" && slots.some((slot) => typeof slot !== "number" || !Number.isInteger(slot) || slot < 1 || slot > 7)) return { error: "Os dias semanais devem estar entre segunda e domingo." };
    if (cadence === "month" && slots.some((slot) => typeof slot !== "number" || !Number.isInteger(slot) || slot < 1 || slot > 28)) return { error: "Para garantir a contagem exata em todos os meses, use dias do mês entre 1 e 28." };
    if (cadence === "year" && slots.some((slot) => typeof slot !== "string" || !validAnnualSlot(slot))) return { error: "As datas anuais devem estar no formato MM-DD e existir em todos os anos." };
    return { definition: { version: 1, cadence: cadence as RecurrenceCadence, interval: 1, startDate, endDate, time, timeZone, weekdays: cadence === "week" ? slots as number[] : undefined, dayOfMonth, durationMinutes, occurrencesPerPeriod, periodSlots: slots, keyMode: "period" } };
  }
  const normalizedWeekdays = cadence === "week" ? (weekdays?.length ? weekdays : [isoWeekday(utcDate(startDate))]) : undefined;
  return { definition: { version: 1, cadence: cadence as RecurrenceCadence, interval, startDate, endDate, time, timeZone, weekdays: normalizedWeekdays, dayOfMonth, durationMinutes, keyMode: "instant" } };
}

type Descriptor = { logicalKey: string; scheduledAt: string; localDate: string; periodKey: string | null };

export function recurrenceOccurrenceDescriptor(definition: RecurrenceDefinition, taskType: RecurrenceTaskType, localDate: string, scheduledAt?: string | null): Descriptor {
  const day = utcDate(localDate);
  const instant = scheduledAt && !Number.isNaN(new Date(scheduledAt).getTime()) ? new Date(scheduledAt).toISOString() : atTime(day, definition.time, definition.timeZone ?? defaultTimeZone).toISOString();
  if (taskType !== "periodic") return { logicalKey: `instant:${instant}`, scheduledAt: instant, localDate, periodKey: null };
  const periodKey = periodKeyFor(day, definition.cadence);
  const slot = definition.cadence === "week" ? isoWeekday(day) : definition.cadence === "month" ? day.getUTCDate() : localDate.slice(5);
  return { logicalKey: `period:${periodKey}:slot:${String(slot)}`, scheduledAt: instant, localDate, periodKey };
}

function descriptorsFor(definition: RecurrenceDefinition, from: string, to: string): Descriptor[] {
  const start = utcDate(definition.startDate);
  const lower = utcDate(from < definition.startDate ? definition.startDate : from);
  const upper = utcDate(to);
  const result: Descriptor[] = [];
  const add = (day: Date) => {
    if (day < lower || day > upper || (definition.endDate && dateKey(day) > definition.endDate)) return;
    const timeZone = definition.timeZone ?? defaultTimeZone;
    const scheduled = atTime(day, definition.time, timeZone);
    const periodKey = definition.keyMode === "period" ? periodKeyFor(day, definition.cadence) : null;
    result.push({ logicalKey: definition.keyMode === "period" ? `period:${periodKey}` : `instant:${scheduled.toISOString()}`, scheduledAt: scheduled.toISOString(), localDate: dateKey(day), periodKey });
  };
  if (definition.cadence === "day") {
    for (let day = start; day <= upper && result.length < 2000; day = addDays(day, definition.interval)) add(day);
  } else if (definition.cadence === "week") {
    const weekdays = definition.weekdays?.length ? definition.weekdays : [isoWeekday(start)];
    for (let day = start; day <= upper && result.length < 2000; day = addDays(day, 1)) {
      const weekIndex = Math.floor((day.getTime() - startOfWeek(start).getTime()) / 604800000);
      if (weekIndex >= 0 && weekIndex % definition.interval === 0 && weekdays.includes(isoWeekday(day))) add(day);
    }
  } else if (definition.cadence === "month") {
    const dayOfMonth = definition.dayOfMonth ?? start.getUTCDate();
    for (let month = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)); month <= upper && result.length < 2000; month = addMonths(month, definition.interval)) {
      if (dayOfMonth <= daysInMonth(month.getUTCFullYear(), month.getUTCMonth())) add(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), dayOfMonth)));
    }
  } else {
    const month = start.getUTCMonth(); const dayOfMonth = definition.dayOfMonth ?? start.getUTCDate();
    for (let year = start.getUTCFullYear(); year <= upper.getUTCFullYear() && result.length < 2000; year += definition.interval) {
      if (dayOfMonth <= daysInMonth(year, month)) add(new Date(Date.UTC(year, month, dayOfMonth)));
    }
  }
  return result.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

function periodicDescriptorsFor(definition: RecurrenceDefinition, from: string, to: string): Descriptor[] {
  const lower = utcDate(from < definition.startDate ? definition.startDate : from);
  const upper = utcDate(to);
  const slots = definition.periodSlots ?? (definition.cadence === "week" ? definition.weekdays ?? [1] : definition.cadence === "month" ? [definition.dayOfMonth ?? 1] : [`01-${String(definition.dayOfMonth ?? 1).padStart(2, "0")}`]);
  const result: Descriptor[] = [];
  const add = (day: Date, slot: string | number) => {
    if (day < lower || day > upper || (definition.endDate && dateKey(day) > definition.endDate)) return;
    const scheduled = atTime(day, definition.time, definition.timeZone ?? defaultTimeZone);
    const periodKey = periodKeyFor(day, definition.cadence);
    result.push({ logicalKey: `period:${periodKey}:slot:${String(slot)}`, scheduledAt: scheduled.toISOString(), localDate: dateKey(day), periodKey });
  };
  if (definition.cadence === "week") {
    for (let period = startOfWeek(utcDate(definition.startDate)); period <= upper; period = addDays(period, 7)) for (const slot of slots as number[]) add(addDays(period, slot - 1), slot);
  } else if (definition.cadence === "month") {
    for (let period = new Date(Date.UTC(utcDate(definition.startDate).getUTCFullYear(), utcDate(definition.startDate).getUTCMonth(), 1)); period <= upper; period = addMonths(period, 1)) for (const slot of slots as number[]) add(new Date(Date.UTC(period.getUTCFullYear(), period.getUTCMonth(), slot)), slot);
  } else {
    for (let period = new Date(Date.UTC(utcDate(definition.startDate).getUTCFullYear(), 0, 1)); period <= upper; period = new Date(Date.UTC(period.getUTCFullYear() + 1, 0, 1))) for (const slot of slots as string[]) { const [month, day] = slot.split("-").map(Number); add(new Date(Date.UTC(period.getUTCFullYear(), month - 1, day)), slot); }
  }
  return result.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

export async function materializeSeries(context: RecurrenceContext, series: typeof recurrenceSeries.$inferSelect, range?: { from?: string; to?: string }, options?: { assigneeIds?: string[]; size?: "xs" | "s" | "m" | "l" | "xl" | null; importance?: "low" | "medium" | "high" | null; urgency?: "low" | "medium" | "high" | null; approvalRequired?: boolean }) {
  const now = new Date();
  const defaultFrom = dateKey(now);
  const defaultTo = dateKey(addMonths(utcDate(defaultFrom), recurrenceHorizonMonths));
  const from = range?.from ?? defaultFrom;
  const to = range?.to ?? defaultTo;
  const windowError = recurrenceWindowError(from, to);
  if (windowError) return { error: windowError };
  let definition: RecurrenceDefinition;
  try { definition = JSON.parse(series.definitionJson) as RecurrenceDefinition; } catch { return { error: "A definição desta série está corrompida." }; }
  const generated = series.taskType === "periodic" ? periodicDescriptorsFor(definition, from, to) : descriptorsFor(definition, from, to);
  const existing = await context.db.select({ logicalKey: recurrenceOccurrences.logicalKey }).from(recurrenceOccurrences).where(eq(recurrenceOccurrences.seriesId, series.id));
  const existingKeys = new Set(existing.map((row: { logicalKey: string }) => row.logicalKey));
  let created = 0;
  for (const occurrence of generated) {
    if (existingKeys.has(occurrence.logicalKey)) continue;
    // O ID determinístico transforma a criação da ocorrência em uma operação idempotente
    // mesmo quando duas abas ou workers materializam a mesma janela simultaneamente.
    const taskId = `recurrence:${series.id}:${occurrence.logicalKey}`;
    const scheduledDate = occurrence.localDate;
    const taskValues = {
      id: taskId, personalSpaceId: series.personalSpaceId, authorUserId: series.authorUserId, ownerUserId: series.ownerUserId,
      organizationId: series.organizationId, title: series.title, description: series.description, taskType: series.taskType,
      status: "todo" as const, dueDate: series.taskType === "scheduled" ? null : scheduledDate,
      startAt: series.taskType === "scheduled" ? occurrence.scheduledAt : null,
      durationMinutes: series.taskType === "scheduled" ? definition.durationMinutes : null,
      dateAt: null, endAt: null, approvalRequired: options?.approvalRequired ?? false,
      size: options?.size ?? null, importance: options?.importance ?? null, urgency: options?.urgency ?? null,
    };
    await context.db.insert(tasks).values(taskValues).onConflictDoNothing();
    const [task] = await context.db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId)).limit(1);
    if (!task) continue;
    await context.db.insert(hierarchyAttachments).values({ id: crypto.randomUUID(), childType: "task", childId: taskId, parentType: series.parentType, parentId: series.parentId }).onConflictDoNothing();
    const [inserted] = await context.db.insert(recurrenceOccurrences).values({ id: crypto.randomUUID(), seriesId: series.id, taskId, logicalKey: occurrence.logicalKey, scheduledAt: occurrence.scheduledAt, periodKey: occurrence.periodKey }).onConflictDoNothing().returning();
    if (!inserted) continue;
    await context.db.insert(itemRoleAssignments).values({ id: crypto.randomUUID(), itemType: "task", itemId: taskId, userId: series.ownerUserId, role: "owner" }).onConflictDoNothing();
    for (const userId of [...new Set(options?.assigneeIds ?? [])]) {
      await context.db.insert(taskAssignees).values({ taskId, userId }).onConflictDoNothing();
      if (userId !== series.ownerUserId) await context.db.insert(itemRoleAssignments).values({ id: crypto.randomUUID(), itemType: "task", itemId: taskId, userId, role: "executor" }).onConflictDoNothing();
    }
    await context.db.insert(auditEvents).values({ id: crypto.randomUUID(), organizationId: series.organizationId, personalSpaceId: series.organizationId ? null : series.personalSpaceId, actorUserId: series.authorUserId, actorName: "Taskando", action: "task_created", subjectType: "task", subjectId: taskId, summary: `materializou a ocorrência ${scheduledDate} da série “${series.title}”.` });
    existingKeys.add(occurrence.logicalKey);
    created += 1;
  }
  return { created, considered: generated.length, from, to };
}

export async function firstMaterializedTask(context: RecurrenceContext, seriesId: string) {
  const [occurrence] = await context.db.select({ taskId: recurrenceOccurrences.taskId }).from(recurrenceOccurrences).where(eq(recurrenceOccurrences.seriesId, seriesId)).orderBy(asc(recurrenceOccurrences.scheduledAt)).limit(1);
  if (!occurrence) return null;
  const [task] = await context.db.select().from(tasks).where(eq(tasks.id, occurrence.taskId)).limit(1);
  return task ?? null;
}
