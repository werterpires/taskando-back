import { and, eq } from "drizzle-orm";
import { ensurePersonalContext } from "../../../../db/current-user";
import { materializeSeries, recurrenceWindowError } from "../../../../db/recurrence";
import { recurrenceSeries } from "../../../../db/schema";

export async function POST(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const payload = await request.json().catch(() => ({})) as { from?: string; to?: string };
  const windowError = recurrenceWindowError(payload.from, payload.to);
  if (windowError) return Response.json({ error: windowError }, { status: 400 });

  const series = await context.db.select().from(recurrenceSeries).where(and(eq(recurrenceSeries.ownerUserId, context.user.id), eq(recurrenceSeries.active, true)));
  let created = 0;
  let considered = 0;
  for (const item of series) {
    const result = await materializeSeries(context, item, { from: payload.from, to: payload.to });
    if (result.error) return Response.json({ error: result.error }, { status: 400 });
    created += result.created ?? 0;
    considered += result.considered ?? 0;
  }
  return Response.json({ from: payload.from, to: payload.to, seriesCount: series.length, created, considered });
}
