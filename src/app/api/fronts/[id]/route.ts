import { eq } from "drizzle-orm";
import { canAccessFront, canItem } from "../../../../db/authorization";
import { recordAuditEvent } from "../../../../db/audit";
import { ensurePersonalContext } from "../../../../db/current-user";
import { fronts } from "../../../../db/schema";
import { statusAfterApprovalConfiguration } from "../../../../db/approval";
import { recordApprovalRequested } from "../../../../db/approval-audit";
import type { WorkState } from "../../../../db/task-state";

const statuses = ["planned", "todo", "in_progress", "awaiting_approval", "completed", "cancelled", "archived"] as const;
const sizes = ["xs", "s", "m", "l", "xl"] as const;
const priorities = ["low", "medium", "high"] as const;

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  const [front] = await context.db.select().from(fronts).where(eq(fronts.id, id)).limit(1);
  if (!front || !await canAccessFront(context.db, context.user.id, id, context.space.id, "view")) return Response.json({ error: "Frente não encontrada." }, { status: 404 });
  return Response.json({ front });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  const [front] = await context.db.select().from(fronts).where(eq(fronts.id, id)).limit(1);
  if (!front || !await canAccessFront(context.db, context.user.id, id, context.space.id, "view")) return Response.json({ error: "Frente não encontrada." }, { status: 404 });
  const payload = await request.json() as { title?: string; description?: string; status?: typeof statuses[number]; approvalRequired?: boolean; approve?: boolean; size?: typeof sizes[number] | null; importance?: typeof priorities[number] | null; urgency?: typeof priorities[number] | null; projectId?: string; parentType?: string; parentId?: string };
  if (payload.projectId !== undefined || payload.parentType !== undefined || payload.parentId !== undefined) return Response.json({ error: "Uma frente permanece sempre no projeto em que foi criada." }, { status: 400 });
  const hasChanges = payload.title !== undefined || payload.description !== undefined || payload.status !== undefined || payload.approvalRequired !== undefined || payload.size !== undefined || payload.importance !== undefined || payload.urgency !== undefined;
  if (hasChanges && front.ownerUserId !== context.user.id && !await canItem(context.db, context.user.id, "front", id, "edit")) return Response.json({ error: "Você não pode editar esta frente." }, { status: 403 });
  if (payload.status !== undefined && !statuses.includes(payload.status)) return Response.json({ error: "Status de frente inválido." }, { status: 400 });
  if (payload.size !== undefined && payload.size !== null && !sizes.includes(payload.size)) return Response.json({ error: "Tamanho de frente inválido." }, { status: 400 });
  if (payload.importance !== undefined && payload.importance !== null && !priorities.includes(payload.importance)) return Response.json({ error: "Importância de frente inválida." }, { status: 400 });
  if (payload.urgency !== undefined && payload.urgency !== null && !priorities.includes(payload.urgency)) return Response.json({ error: "Urgência de frente inválida." }, { status: 400 });
  if (payload.approvalRequired !== undefined && typeof payload.approvalRequired !== "boolean") return Response.json({ error: "Configuração de aprovação inválida." }, { status: 400 });
  if (payload.approve) {
    if (!front.approvalRequired || front.status !== "awaiting_approval") return Response.json({ error: "Esta frente não está aguardando aprovação." }, { status: 400 });
    if (front.ownerUserId !== context.user.id && !await canItem(context.db, context.user.id, "front", id, "approve")) return Response.json({ error: "Você não pode aprovar esta frente." }, { status: 403 });
  }
  const update: Partial<typeof fronts.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (payload.title !== undefined) { const title = payload.title.trim().replace(/\s+/g, " "); if (!title || title.length > 140) return Response.json({ error: "Informe um título de até 140 caracteres." }, { status: 400 }); update.title = title; }
  if (payload.description !== undefined) update.description = payload.description.trim();
  if (payload.approvalRequired !== undefined) update.approvalRequired = payload.approvalRequired;
  if (payload.status !== undefined) update.status = statusAfterApprovalConfiguration(payload.status, payload.approvalRequired ?? front.approvalRequired);
  if (payload.approvalRequired === false && front.approvalRequired && front.status === "awaiting_approval" && payload.status === undefined) update.status = "in_progress";
  if (payload.approve) { update.status = "completed"; update.approvedAt = new Date().toISOString(); update.approvedByUserId = context.user.id; }
  if (payload.size !== undefined) update.size = payload.size;
  if (payload.importance !== undefined) update.importance = payload.importance;
  if (payload.urgency !== undefined) update.urgency = payload.urgency;
  const [saved] = await context.db.update(fronts).set(update).where(eq(fronts.id, id)).returning();
  if (hasChanges) await recordAuditEvent(context.db, { organizationId: saved.organizationId ?? undefined, personalSpaceId: saved.organizationId ? undefined : context.space.id, actorUserId: context.user.id, actorName: context.user.displayName, action: "front_edited", subjectType: "front", subjectId: id, summary: `editou a frente “${saved.title}”.` });
  if (saved.status === "awaiting_approval" && front.status !== "awaiting_approval") await recordApprovalRequested(context.db, { organizationId: saved.organizationId, personalSpaceId: saved.organizationId ? null : context.space.id, actorUserId: context.user.id, actorName: context.user.displayName, subjectType: "front", subjectId: id, title: saved.title, previousStatus: front.status as WorkState });
  return Response.json({ front: saved });
}
