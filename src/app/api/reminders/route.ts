import { and, asc, eq } from "drizzle-orm";
import { ensurePersonalContext } from "../../../db/current-user";
import { normalizeReminderTitle, normalizeReminderTimeZone, reminderDefaultTimeZone, validateReminderDate } from "../../../db/reminders";
import { reminders } from "../../../db/schema";

export async function GET() {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const rows = await context.db.select().from(reminders).where(eq(reminders.personalSpaceId, context.space.id)).orderBy(asc(reminders.remindAt));
  return Response.json({ reminders: rows });
}

export async function POST(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const payload = await request.json() as { title?: unknown; description?: unknown; remindAt?: unknown; timeZone?: unknown };
  const title = normalizeReminderTitle(payload.title);
  const dateError = validateReminderDate(payload.remindAt);
  const timeZone = normalizeReminderTimeZone(payload.timeZone);
  if (title.error || dateError || timeZone.error) return Response.json({ error: title.error ?? dateError ?? timeZone.error }, { status: 400 });
  const remindAt = new Date(payload.remindAt as string).toISOString();
  const [reminder] = await context.db.insert(reminders).values({ id: crypto.randomUUID(), personalSpaceId: context.space.id, ownerUserId: context.user.id, title: title.value!, description: typeof payload.description === "string" ? payload.description.trim() : "", remindAt, timeZone: timeZone.value ?? reminderDefaultTimeZone }).returning();
  return Response.json({ reminder }, { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const payload = await request.json() as { id?: string; title?: unknown; description?: unknown; remindAt?: unknown; timeZone?: unknown };
  if (!payload.id) return Response.json({ error: "Lembrete inválido." }, { status: 400 });
  const [current] = await context.db.select().from(reminders).where(and(eq(reminders.id, payload.id), eq(reminders.personalSpaceId, context.space.id))).limit(1);
  if (!current) return Response.json({ error: "Lembrete não encontrado." }, { status: 404 });
  const update: Partial<typeof reminders.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (payload.title !== undefined) {
    const title = normalizeReminderTitle(payload.title);
    if (title.error) return Response.json({ error: title.error }, { status: 400 });
    update.title = title.value;
  }
  if (payload.description !== undefined) update.description = typeof payload.description === "string" ? payload.description.trim() : "";
  if (payload.remindAt !== undefined) {
    const dateError = validateReminderDate(payload.remindAt);
    if (dateError) return Response.json({ error: dateError }, { status: 400 });
    update.remindAt = new Date(payload.remindAt as string).toISOString();
    update.firedAt = null;
  }
  if (payload.timeZone !== undefined) {
    const timeZone = normalizeReminderTimeZone(payload.timeZone);
    if (timeZone.error) return Response.json({ error: timeZone.error }, { status: 400 });
    update.timeZone = timeZone.value;
  }
  const [reminder] = await context.db.update(reminders).set(update).where(eq(reminders.id, current.id)).returning();
  return Response.json({ reminder });
}

export async function DELETE(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const payload = await request.json() as { id?: string };
  if (!payload.id) return Response.json({ error: "Lembrete inválido." }, { status: 400 });
  const deleted = await context.db.delete(reminders).where(and(eq(reminders.id, payload.id), eq(reminders.personalSpaceId, context.space.id))).returning({ id: reminders.id });
  if (!deleted.length) return Response.json({ error: "Lembrete não encontrado." }, { status: 404 });
  return Response.json({ id: deleted[0].id });
}
