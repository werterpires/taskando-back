import { desc, eq } from "drizzle-orm";
import { ensurePersonalContext } from "../../../db/current-user";
import { recurrenceOccurrences, recurrenceSeries } from "../../../db/schema";
import { createRecurrenceSeries, parseRecurrenceDefinition, recurrenceTaskTypes } from "../../../db/recurrence";
import { resolveTaskParent } from "../tasks/shared";
import { taskTypeError, type TaskParentType } from "../../../db/task-types";

async function withOccurrenceCount(context: NonNullable<Awaited<ReturnType<typeof ensurePersonalContext>>>, series: typeof recurrenceSeries.$inferSelect) {
  const occurrences = await context.db.select({ id: recurrenceOccurrences.id, logicalKey: recurrenceOccurrences.logicalKey, scheduledAt: recurrenceOccurrences.scheduledAt, periodKey: recurrenceOccurrences.periodKey, taskId: recurrenceOccurrences.taskId }).from(recurrenceOccurrences).where(eq(recurrenceOccurrences.seriesId, series.id));
  let definition: unknown = null;
  try { definition = JSON.parse(series.definitionJson); } catch { definition = null; }
  return { ...series, definition, occurrenceCount: occurrences.length, occurrences };
}

export async function GET() {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const rows = await context.db.select().from(recurrenceSeries).where(eq(recurrenceSeries.ownerUserId, context.user.id)).orderBy(desc(recurrenceSeries.updatedAt));
  return Response.json({ series: await Promise.all(rows.map((series) => withOccurrenceCount(context, series))) });
}

export async function POST(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const payload = await request.json() as { title?: string; description?: string; taskType?: string; definition?: unknown; parentType?: TaskParentType | null; parentId?: string | null };
  const title = payload.title?.trim().replace(/\s+/g, " ") ?? "";
  if (!title || title.length > 160) return Response.json({ error: "Informe um título de até 160 caracteres." }, { status: 400 });
  if (!recurrenceTaskTypes.includes((payload.taskType ?? "") as typeof recurrenceTaskTypes[number])) return Response.json({ error: "Escolha Recorrente, Agendada ou Periódica." }, { status: 400 });
  const taskType = payload.taskType!;
  const typeError = taskTypeError(taskType, payload.parentType ?? null);
  if (typeError) return Response.json({ error: typeError }, { status: 400 });
  const parsed = parseRecurrenceDefinition(payload.definition, taskType);
  if (parsed.error || !parsed.definition) return Response.json({ error: parsed.error ?? "Definição inválida." }, { status: 400 });
  const parentType = payload.parentType ?? null;
  const parentId = payload.parentId ?? null;
  const target = await resolveTaskParent(context, parentType, parentId);
  if (!target.allowed) return Response.json({ error: "Você não pode criar uma série neste local." }, { status: 403 });
  const series = await createRecurrenceSeries(context, {
    title, description: payload.description, taskType: taskType as typeof recurrenceTaskTypes[number],
    definition: parsed.definition, parentType, parentId, organizationId: target.organizationId,
  });
  return Response.json({ series: await withOccurrenceCount(context, series) }, { status: 201 });
}
