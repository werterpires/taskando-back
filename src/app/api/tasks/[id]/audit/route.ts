import { and, desc, eq } from "drizzle-orm";
import { ensurePersonalContext } from "../../../../../db/current-user";
import { auditEvents, tasks } from "../../../../../db/schema";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  const [task] = await context.db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, id), eq(tasks.personalSpaceId, context.space.id))).limit(1);
  if (!task) return Response.json({ error: "Tarefa não encontrada." }, { status: 404 });
  const events = await context.db.select({ id: auditEvents.id, actorName: auditEvents.actorName, action: auditEvents.action, summary: auditEvents.summary, createdAt: auditEvents.createdAt }).from(auditEvents).where(and(eq(auditEvents.subjectType, "task"), eq(auditEvents.subjectId, id), eq(auditEvents.personalSpaceId, context.space.id))).orderBy(desc(auditEvents.createdAt)).limit(80);
  return Response.json({ events });
}
