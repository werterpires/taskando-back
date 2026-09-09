import { and, eq } from "drizzle-orm";
import { ensurePersonalContext } from "../../../../../db/current-user";
import { recurrenceSeries } from "../../../../../db/schema";
import { materializeSeries } from "../../../../../db/recurrence";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const [series] = await context.db.select().from(recurrenceSeries).where(and(eq(recurrenceSeries.id, (await params).id), eq(recurrenceSeries.ownerUserId, context.user.id))).limit(1);
  if (!series) return Response.json({ error: "Série não encontrada." }, { status: 404 });
  if (!series.active) return Response.json({ error: "Esta série está pausada." }, { status: 409 });
  const payload = await request.json().catch(() => ({})) as { from?: string; to?: string };
  const result = await materializeSeries(context, series, { from: payload.from, to: payload.to });
  if (result.error) return Response.json(result, { status: 400 });
  return Response.json(result);
}
