import { and, eq, gte, inArray } from "drizzle-orm";
import { canAccessTask } from "../../../../db/authorization";
import { recordAuditEvent } from "../../../../db/audit";
import { ensurePersonalContext } from "../../../../db/current-user";
import { recurrenceExceptions, recurrenceOccurrences, recurrenceSeries, tasks } from "../../../../db/schema";
import { commitmentTimeError } from "../../../../db/task-types";
import { dateKeyInTimeZone, defaultTimeZone } from "../../../../db/time-zone";

type ExceptionAction = "skip" | "reschedule" | "edit";
type ExceptionScope = "occurrence" | "from_here";

const canonicalDateTime = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const occurrenceId = (await params).id;
  const [occurrence] = await context.db.select().from(recurrenceOccurrences).where(eq(recurrenceOccurrences.id, occurrenceId)).limit(1);
  if (!occurrence) return Response.json({ error: "Ocorrência não encontrada." }, { status: 404 });
  const [series] = await context.db.select().from(recurrenceSeries).where(and(eq(recurrenceSeries.id, occurrence.seriesId), eq(recurrenceSeries.ownerUserId, context.user.id))).limit(1);
  if (!series) return Response.json({ error: "Ocorrência não encontrada." }, { status: 404 });
  if (!(await canAccessTask(context.db, context.user.id, occurrence.taskId, context.space.id, "edit"))) return Response.json({ error: "Você não tem permissão para alterar esta ocorrência." }, { status: 403 });
  const [task] = await context.db.select().from(tasks).where(eq(tasks.id, occurrence.taskId)).limit(1);
  if (!task) return Response.json({ error: "A tarefa da ocorrência não foi encontrada." }, { status: 404 });
  let seriesTimeZone = defaultTimeZone;
  try { seriesTimeZone = (JSON.parse(series.definitionJson) as { timeZone?: string }).timeZone ?? defaultTimeZone; } catch { /* A série inválida será tratada pelo materializador. */ }

  const payload = await request.json().catch(() => ({})) as { action?: ExceptionAction; scope?: ExceptionScope; scheduledAt?: string; title?: string; description?: string; durationMinutes?: number | null };
  const action = payload.action;
  const scope = payload.scope ?? "occurrence";
  if (!action || !["skip", "reschedule", "edit"].includes(action)) return Response.json({ error: "Escolha pular, reagendar ou editar a ocorrência." }, { status: 400 });
  if (![
    "occurrence",
    "from_here",
  ].includes(scope)) return Response.json({ error: "Escopo de exceção inválido." }, { status: 400 });
  if (scope === "from_here" && action !== "edit") return Response.json({ error: "Somente a edição pode valer desta ocorrência em diante." }, { status: 400 });
  const [existingException] = await context.db.select().from(recurrenceExceptions).where(eq(recurrenceExceptions.occurrenceId, occurrence.id)).limit(1);
  if (existingException) return Response.json({ task, exception: existingException, alreadyApplied: true });

  const originalScheduledAt = occurrence.scheduledAt;
  const changes: Record<string, unknown> = {};
  let taskUpdate: Partial<typeof tasks.$inferInsert> = { updatedAt: new Date().toISOString() };
  let overrideScheduledAt: string | null = null;

  if (action === "skip") {
    taskUpdate = { status: "cancelled", completedAt: null, updatedAt: new Date().toISOString() };
    changes.status = "cancelled";
  }

  if (action === "reschedule") {
    const scheduledAt = canonicalDateTime(payload.scheduledAt);
    if (!scheduledAt) return Response.json({ error: "Informe uma nova data e horário válidos." }, { status: 400 });
    overrideScheduledAt = scheduledAt;
    changes.scheduledAt = scheduledAt;
    taskUpdate = task.taskType === "scheduled"
      ? { startAt: scheduledAt, updatedAt: new Date().toISOString() }
      : { dueDate: dateKeyInTimeZone(new Date(scheduledAt), seriesTimeZone) ?? scheduledAt.slice(0, 10), updatedAt: new Date().toISOString() };
  }

  {
    const title = payload.title === undefined ? undefined : payload.title.trim().replace(/\s+/g, " ");
    if (title !== undefined && (!title || title.length > 160)) return Response.json({ error: "Informe um título de até 160 caracteres." }, { status: 400 });
    const description = payload.description === undefined ? undefined : payload.description.trim();
    const durationMinutes = payload.durationMinutes === undefined ? undefined : payload.durationMinutes;
    if (action === "edit" && durationMinutes !== undefined) {
      const timeError = commitmentTimeError(task.taskType, task.startAt, durationMinutes);
      if (task.taskType !== "scheduled" || typeof durationMinutes !== "number" || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 10080) return Response.json({ error: "A duração só pode ser alterada em uma série Agendada e deve estar entre 1 minuto e 7 dias." }, { status: 400 });
      if (timeError) return Response.json({ error: timeError }, { status: 400 });
    }
    if (title === undefined && description === undefined && durationMinutes === undefined) return Response.json({ error: "Informe ao menos uma alteração para esta ocorrência." }, { status: 400 });
    if (title !== undefined) { taskUpdate.title = title; changes.title = title; }
    if (description !== undefined) { taskUpdate.description = description; changes.description = description; }
    if (durationMinutes !== undefined) { taskUpdate.durationMinutes = durationMinutes; changes.durationMinutes = durationMinutes; }

  if (scope === "from_here") {
    const futureOccurrences = await context.db.select({ taskId: recurrenceOccurrences.taskId }).from(recurrenceOccurrences).where(and(eq(recurrenceOccurrences.seriesId, series.id), gte(recurrenceOccurrences.scheduledAt, originalScheduledAt)));
    const futureTaskIds = [...new Set(futureOccurrences.map((item) => item.taskId))];
    if (futureTaskIds.length) await context.db.update(tasks).set(taskUpdate).where(inArray(tasks.id, futureTaskIds));
    const seriesUpdate: Partial<typeof recurrenceSeries.$inferInsert> = { updatedAt: new Date().toISOString() };
    if (title !== undefined) seriesUpdate.title = title;
    if (description !== undefined) seriesUpdate.description = description;
    if (durationMinutes !== undefined && series.taskType === "scheduled") {
      try {
        const definition = JSON.parse(series.definitionJson) as Record<string, unknown>;
        definition.durationMinutes = durationMinutes;
        seriesUpdate.definitionJson = JSON.stringify(definition);
      } catch { return Response.json({ error: "A definição desta série está corrompida." }, { status: 400 }); }
    }
    await context.db.update(recurrenceSeries).set(seriesUpdate).where(eq(recurrenceSeries.id, series.id));
  } else {
    await context.db.update(tasks).set(taskUpdate).where(eq(tasks.id, task.id));
    if (overrideScheduledAt) await context.db.update(recurrenceOccurrences).set({ scheduledAt: overrideScheduledAt }).where(eq(recurrenceOccurrences.id, occurrence.id));
  }

  }
  const [exception] = await context.db.insert(recurrenceExceptions).values({
    id: crypto.randomUUID(), seriesId: series.id, occurrenceId: occurrence.id, action, scope,
    originalScheduledAt, overrideScheduledAt, changesJson: JSON.stringify(changes), createdByUserId: context.user.id,
  }).onConflictDoNothing().returning();
  if (!exception) {
    const [current] = await context.db.select().from(tasks).where(eq(tasks.id, task.id)).limit(1);
    return Response.json({ task: current ?? task, alreadyApplied: true });
  }
  await recordAuditEvent(context.db, {
    organizationId: task.organizationId ?? undefined,
    personalSpaceId: task.organizationId ? undefined : context.space.id,
    actorUserId: context.user.id, actorName: context.user.displayName,
    action: action === "skip" ? "task_status_changed" : "task_edited", subjectType: "task", subjectId: task.id,
    summary: action === "skip" ? `pulou a ocorrência de “${task.title}” sem apagar seu histórico.` : scope === "from_here" ? `editou a série “${series.title}” desta ocorrência em diante.` : action === "reschedule" ? `reagendou a ocorrência de “${task.title}”.` : `editou somente a ocorrência de “${task.title}”.`,
  });
  const [updatedTask] = await context.db.select().from(tasks).where(eq(tasks.id, task.id)).limit(1);
  return Response.json({ task: updatedTask ?? task, exception, seriesId: series.id });
}
