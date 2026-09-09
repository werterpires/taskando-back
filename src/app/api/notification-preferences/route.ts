import { eq } from "drizzle-orm";
import { ensurePersonalContext } from "../../../db/current-user";
import { notificationPreferences } from "../../../db/schema";

const defaults = { dueSoonEnabled: true, overdueEnabled: true, scheduledEnabled: true, reminderEnabled: true, dueSoonMinutes: 1440, timeZone: "America/Sao_Paulo" } as const;

async function getPreferences(context: NonNullable<Awaited<ReturnType<typeof ensurePersonalContext>>>) {
  const [current] = await context.db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, context.user.id)).limit(1);
  if (current) return current;
  const [created] = await context.db.insert(notificationPreferences).values({ userId: context.user.id, ...defaults }).returning();
  return created;
}

export async function GET() {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  return Response.json({ preferences: await getPreferences(context) });
}

export async function PATCH(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const payload = await request.json().catch(() => ({})) as Record<string, unknown>;
  const update: Partial<typeof notificationPreferences.$inferInsert> = {};
  for (const key of ["dueSoonEnabled", "overdueEnabled", "scheduledEnabled", "reminderEnabled"] as const) if (payload[key] !== undefined) {
    if (typeof payload[key] !== "boolean") return Response.json({ error: "Preferência inválida." }, { status: 400 });
    update[key] = payload[key];
  }
  if (payload.dueSoonMinutes !== undefined) {
    const minutes = Number(payload.dueSoonMinutes);
    if (!Number.isInteger(minutes) || minutes < 15 || minutes > 10080) return Response.json({ error: "O aviso de vencimento próximo deve ficar entre 15 minutos e 7 dias." }, { status: 400 });
    update.dueSoonMinutes = minutes;
  }
  if (payload.timeZone !== undefined) {
    if (typeof payload.timeZone !== "string" || !payload.timeZone.trim()) return Response.json({ error: "Fuso horário inválido." }, { status: 400 });
    try { new Intl.DateTimeFormat("en-US", { timeZone: payload.timeZone }).format(); } catch { return Response.json({ error: "Fuso horário inválido." }, { status: 400 }); }
    update.timeZone = payload.timeZone.trim();
  }
  await getPreferences(context);
  const [preferences] = await context.db.update(notificationPreferences).set(update).where(eq(notificationPreferences.userId, context.user.id)).returning();
  return Response.json({ preferences });
}
