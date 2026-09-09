import { desc, eq } from "drizzle-orm";
import { ensurePersonalContext } from "../../../../../db/current-user";
import { auditEvents, organizations } from "../../../../../db/schema";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  const [organization] = await context.db.select({ ownerUserId: organizations.ownerUserId }).from(organizations).where(eq(organizations.id, id)).limit(1);
  if (!organization) return Response.json({ error: "Organização não encontrada." }, { status: 404 });
  if (organization.ownerUserId !== context.user.id) return Response.json({ error: "Somente o Owner pode consultar a auditoria." }, { status: 403 });
  const events = await context.db.select({ id: auditEvents.id, actorName: auditEvents.actorName, action: auditEvents.action, summary: auditEvents.summary, createdAt: auditEvents.createdAt }).from(auditEvents).where(eq(auditEvents.organizationId, id)).orderBy(desc(auditEvents.createdAt)).limit(120);
  return Response.json({ events });
}
