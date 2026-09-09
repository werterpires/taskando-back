import { and, desc, eq, isNotNull, isNull, or } from "drizzle-orm";
import { ensurePersonalContext } from "../../../../db/current-user";
import { privacyRequests } from "../../../../db/schema";
import { takeRateLimit } from "../../../../db/rate-limit";

export async function GET() {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const requests = await context.db.select({ id: privacyRequests.id, type: privacyRequests.type, status: privacyRequests.status, createdAt: privacyRequests.createdAt, updatedAt: privacyRequests.updatedAt, completedAt: privacyRequests.completedAt }).from(privacyRequests).where(eq(privacyRequests.userId, context.user.id)).orderBy(desc(privacyRequests.createdAt));
  return Response.json({ requests });
}

export async function POST(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const rate = takeRateLimit(`privacy-deletion:${context.user.id}`, 2, 60 * 60 * 1000);
  if (!rate.allowed) return Response.json({ error: "Muitas solicitações em pouco tempo. Tente novamente mais tarde." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  const payload = await request.json() as { confirmation?: string };
  if (payload.confirmation !== "EXCLUIR") return Response.json({ error: "Para solicitar a exclusão, confirme digitando EXCLUIR." }, { status: 400 });
  const pendingKey = `${context.user.id}:deletion`;
  const [existing] = await context.db.select({ id: privacyRequests.id, status: privacyRequests.status }).from(privacyRequests).where(and(eq(privacyRequests.userId, context.user.id), eq(privacyRequests.type, "deletion"), isNull(privacyRequests.completedAt))).orderBy(desc(privacyRequests.createdAt)).limit(1);
  if (existing && ["pending", "processing"].includes(existing.status)) return Response.json({ error: "Já existe uma solicitação de exclusão em andamento.", requestId: existing.id }, { status: 409 });
  await context.db.update(privacyRequests).set({ pendingKey: null, updatedAt: new Date().toISOString() }).where(and(eq(privacyRequests.userId, context.user.id), eq(privacyRequests.type, "deletion"), isNotNull(privacyRequests.pendingKey), or(eq(privacyRequests.status, "completed"), eq(privacyRequests.status, "cancelled"))));
  try {
    const [created] = await context.db.insert(privacyRequests).values({ id: crypto.randomUUID(), userId: context.user.id, type: "deletion", status: "pending", pendingKey }).returning({ id: privacyRequests.id, status: privacyRequests.status, createdAt: privacyRequests.createdAt });
    return Response.json({ request: created, message: "Solicitação registrada. Os dados compartilhados não serão removidos automaticamente de outros usuários ou organizações." }, { status: 201 });
  } catch {
    return Response.json({ error: "Já existe uma solicitação de exclusão em andamento." }, { status: 409 });
  }
}
