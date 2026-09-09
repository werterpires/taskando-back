import { and, eq } from "drizzle-orm";
import { ensurePersonalContext } from "../../../../db/current-user";
import { recurrenceOccurrences, recurrenceSeries } from "../../../../db/schema";
import { parseRecurrenceDefinition, recurrenceTaskTypes } from "../../../../db/recurrence";

async function loadOwnedSeries(context: NonNullable<Awaited<ReturnType<typeof ensurePersonalContext>>>, id: string) {
  const [series] = await context.db.select().from(recurrenceSeries).where(and(eq(recurrenceSeries.id, id), eq(recurrenceSeries.ownerUserId, context.user.id))).limit(1);
  return series;
}

async function serialize(context: NonNullable<Awaited<ReturnType<typeof ensurePersonalContext>>>, series: typeof recurrenceSeries.$inferSelect) {
  const occurrences = await context.db.select().from(recurrenceOccurrences).where(eq(recurrenceOccurrences.seriesId, series.id));
  let definition: unknown = null;
  try { definition = JSON.parse(series.definitionJson); } catch { /* a corrupted definition is reported as null */ }
  return { ...series, definition, occurrenceCount: occurrences.length, occurrences };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const series = await loadOwnedSeries(context, (await params).id);
  if (!series) return Response.json({ error: "Série não encontrada." }, { status: 404 });
  return Response.json({ series: await serialize(context, series) });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const series = await loadOwnedSeries(context, (await params).id);
  if (!series) return Response.json({ error: "Série não encontrada." }, { status: 404 });
  const payload = await request.json() as { title?: string; description?: string; taskType?: string; definition?: unknown; active?: boolean };
  const update: Partial<typeof recurrenceSeries.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (payload.title !== undefined) {
    const title = payload.title.trim().replace(/\s+/g, " ");
    if (!title || title.length > 160) return Response.json({ error: "Informe um título de até 160 caracteres." }, { status: 400 });
    update.title = title;
  }
  if (payload.description !== undefined) update.description = payload.description.trim();
  if (payload.active !== undefined) {
    if (typeof payload.active !== "boolean") return Response.json({ error: "Estado da série inválido." }, { status: 400 });
    update.active = payload.active;
  }
  const nextType = payload.taskType ?? series.taskType;
  if (!recurrenceTaskTypes.includes(nextType as typeof recurrenceTaskTypes[number])) return Response.json({ error: "Escolha Recorrente, Agendada ou Periódica." }, { status: 400 });
  if (payload.taskType !== undefined) update.taskType = nextType as typeof recurrenceSeries.$inferInsert.taskType;
  if (payload.definition !== undefined || payload.taskType !== undefined) {
    let input = payload.definition;
    if (input === undefined) {
      try { input = JSON.parse(series.definitionJson); } catch { return Response.json({ error: "A definição atual da série está corrompida." }, { status: 400 }); }
    }
    const parsed = parseRecurrenceDefinition(input, nextType);
    if (parsed.error || !parsed.definition) return Response.json({ error: parsed.error ?? "Definição inválida." }, { status: 400 });
    update.definitionJson = JSON.stringify(parsed.definition);
  }
  if (Object.keys(update).length === 1) return Response.json({ error: "Nenhuma alteração recebida." }, { status: 400 });
  const [updated] = await context.db.update(recurrenceSeries).set(update).where(eq(recurrenceSeries.id, series.id)).returning();
  return Response.json({ series: await serialize(context, updated), historyPreserved: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const series = await loadOwnedSeries(context, (await params).id);
  if (!series) return Response.json({ error: "Série não encontrada." }, { status: 404 });
  const [updated] = await context.db.update(recurrenceSeries).set({ active: false, updatedAt: new Date().toISOString() }).where(eq(recurrenceSeries.id, series.id)).returning();
  return Response.json({ series: await serialize(context, updated), historyPreserved: true });
}
