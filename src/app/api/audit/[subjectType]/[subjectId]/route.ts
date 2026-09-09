import { and, desc, eq } from "drizzle-orm";
import { canAccessPhase, canAccessProcess, canAccessProduct, canAccessProject, canAccessFront, canAccessTask } from "../../../../../db/authorization";
import { ensurePersonalContext } from "../../../../../db/current-user";
import { auditEvents } from "../../../../../db/schema";

const subjectTypes = ["task", "project", "front", "product", "process", "phase"] as const;
type SubjectType = typeof subjectTypes[number];

export async function GET(_: Request, { params }: { params: Promise<{ subjectType: string; subjectId: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { subjectType, subjectId } = await params;
  if (!subjectTypes.includes(subjectType as SubjectType)) return Response.json({ error: "Tipo de item inválido." }, { status: 400 });
  const type = subjectType as SubjectType;
  const allowed = type === "task" ? await canAccessTask(context.db, context.user.id, subjectId, context.space.id, "view") : type === "project" ? await canAccessProject(context.db, context.user.id, subjectId, context.space.id, "view") : type === "front" ? await canAccessFront(context.db, context.user.id, subjectId, context.space.id, "view") : type === "product" ? await canAccessProduct(context.db, context.user.id, subjectId, context.space.id, "view") : type === "process" ? await canAccessProcess(context.db, context.user.id, subjectId, context.space.id, "view") : await canAccessPhase(context.db, context.user.id, subjectId, context.space.id, "view");
  if (!allowed) return Response.json({ error: "Item não encontrado." }, { status: 404 });
  const events = await context.db.select({ id: auditEvents.id, actorName: auditEvents.actorName, action: auditEvents.action, summary: auditEvents.summary, createdAt: auditEvents.createdAt }).from(auditEvents).where(and(eq(auditEvents.subjectType, type), eq(auditEvents.subjectId, subjectId))).orderBy(desc(auditEvents.createdAt)).limit(100);
  return Response.json({ events });
}
