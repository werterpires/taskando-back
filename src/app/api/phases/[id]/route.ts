import { eq } from "drizzle-orm";
import { canAccessPhase, canItem } from "../../../../db/authorization";
import { recordAuditEvent } from "../../../../db/audit";
import { ensurePersonalContext } from "../../../../db/current-user";
import { auditEvents, phases } from "../../../../db/schema";
import { statusAfterApprovalConfiguration } from "../../../../db/approval";
import { recordApprovalRequested } from "../../../../db/approval-audit";
import { phaseDependencySuccessors, refreshProcessCompletionForItem } from "../../../../db/dependency-release";
import type { WorkState } from "../../../../db/task-state";

const statuses = ["planned", "todo", "in_progress", "awaiting_approval", "completed", "cancelled", "archived"] as const;
const sizes = ["xs", "s", "m", "l", "xl"] as const;
const priorities = ["low", "medium", "high"] as const;
const response = (phase: typeof phases.$inferSelect) => ({ ...phase, parentType: "process" as const, parentId: phase.processId });

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  const [phase] = await context.db.select().from(phases).where(eq(phases.id, id)).limit(1);
  if (!phase || !await canAccessPhase(context.db, context.user.id, id, context.space.id)) return Response.json({ error: "Fase não encontrada." }, { status: 404 });
  return Response.json({ phase: response(phase) });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  const [phase] = await context.db.select().from(phases).where(eq(phases.id, id)).limit(1);
  if (!phase || !await canAccessPhase(context.db, context.user.id, id, context.space.id)) return Response.json({ error: "Fase não encontrada." }, { status: 404 });
  const body = await request.json() as { title?: string; description?: string; status?: typeof statuses[number]; approvalRequired?: boolean; size?: typeof sizes[number] | null; importance?: typeof priorities[number] | null; urgency?: typeof priorities[number] | null; approve?: boolean; cancelDecision?: "release" | "cascade"; parentType?: unknown; parentId?: unknown; processId?: unknown; position?: number };
  if (body.parentType !== undefined || body.parentId !== undefined || body.processId !== undefined) return Response.json({ error: "A Fase deve permanecer no Processo pai." }, { status: 400 });
  const editing = body.title !== undefined || body.description !== undefined || body.status !== undefined || body.approvalRequired !== undefined || body.size !== undefined || body.importance !== undefined || body.urgency !== undefined || body.position !== undefined;
  if (editing && phase.ownerUserId !== context.user.id && !await canItem(context.db, context.user.id, "phase", id, "edit")) return Response.json({ error: "Você não pode editar esta Fase." }, { status: 403 });
  if (body.approve && phase.ownerUserId !== context.user.id && !await canItem(context.db, context.user.id, "phase", id, "approve")) return Response.json({ error: "Você não pode aprovar esta Fase." }, { status: 403 });
  if ((body.status && !statuses.includes(body.status)) || (body.size && !sizes.includes(body.size)) || (body.importance && !priorities.includes(body.importance)) || (body.urgency && !priorities.includes(body.urgency)) || (body.position !== undefined && (!Number.isInteger(body.position) || body.position < 0))) return Response.json({ error: "Dados de Fase inválidos." }, { status: 400 });
  if (body.approvalRequired !== undefined && typeof body.approvalRequired !== "boolean") return Response.json({ error: "Configuração de aprovação inválida." }, { status: 400 });
  if (body.cancelDecision !== undefined && body.cancelDecision !== "release" && body.cancelDecision !== "cascade") return Response.json({ error: "Decisão de cancelamento inválida." }, { status: 400 });

  let cancellationPlan: { decision: "release" | "cascade"; cascadeTargets: typeof phases.$inferSelect[] } | null = null;
  if (body.status === "cancelled") {
    const successors = await phaseDependencySuccessors(context, id);
    if (successors.length && !body.cancelDecision) return Response.json({ error: "Escolha o que fazer com as sucessoras antes de cancelar esta Fase.", requiresCancellationDecision: true, successors: successors.map((item) => ({ id: item.id, title: item.title, status: item.status })), cascadeTargets: successors.filter((item) => !["completed", "cancelled", "archived"].includes(item.status)).map((item) => ({ id: item.id, title: item.title })) }, { status: 409 });
    if (body.cancelDecision) {
      for (const successor of successors) if (successor.ownerUserId !== context.user.id && !await canItem(context.db, context.user.id, "phase", successor.id, "edit")) return Response.json({ error: "Você não tem permissão para aplicar esta decisão a todas as sucessoras." }, { status: 403 });
      cancellationPlan = { decision: body.cancelDecision, cascadeTargets: successors.filter((item) => !["completed", "cancelled", "archived"].includes(item.status)) };
    }
  }

  const update: Partial<typeof phases.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (body.title !== undefined) { const title = body.title.trim().replace(/\s+/g, " "); if (!title || title.length > 140) return Response.json({ error: "Informe um título de até 140 caracteres." }, { status: 400 }); update.title = title; }
  if (body.description !== undefined) update.description = body.description.trim();
  if (body.approvalRequired !== undefined) update.approvalRequired = body.approvalRequired;
  if (body.size !== undefined) update.size = body.size;
  if (body.importance !== undefined) update.importance = body.importance;
  if (body.urgency !== undefined) update.urgency = body.urgency;
  if (body.position !== undefined) update.position = body.position;
  const approvalRequired = body.approvalRequired ?? phase.approvalRequired;
  if (body.status !== undefined) update.status = statusAfterApprovalConfiguration(body.status, approvalRequired);
  if (body.approvalRequired === false && phase.approvalRequired && phase.status === "awaiting_approval" && body.status === undefined) update.status = "in_progress";
  if (body.approve) { if (!phase.approvalRequired || phase.status !== "awaiting_approval") return Response.json({ error: "Esta Fase não está aguardando aprovação." }, { status: 400 }); update.status = "completed"; update.approvedAt = new Date().toISOString(); update.approvedByUserId = context.user.id; }

  let saved: typeof phases.$inferSelect;
  if (cancellationPlan) {
    const changedAt = new Date().toISOString();
    const changedPhases = [phase, ...(cancellationPlan.decision === "cascade" ? cancellationPlan.cascadeTargets : [])];
    await context.db.batch([
      ...changedPhases.map((item) => context.db.update(phases).set(item.id === phase.id ? { ...update, status: "cancelled", updatedAt: changedAt } : { status: "cancelled", updatedAt: changedAt }).where(eq(phases.id, item.id))),
      ...changedPhases.map((item) => context.db.insert(auditEvents).values({ id: crypto.randomUUID(), personalSpaceId: item.organizationId ? null : context.space.id, organizationId: item.organizationId, actorUserId: context.user.id, actorName: context.user.displayName, action: "phase_edited", subjectType: "phase", subjectId: item.id, summary: item.id === phase.id ? `cancelou a Fase “${item.title}” com a decisão “${cancellationPlan!.decision === "release" ? "liberar sucessoras" : "cancelar sucessoras em cascata"}”.` : `foi cancelada em cascata após o cancelamento da Fase “${phase.title}”.` }))
    ]);
    const [updated] = await context.db.select().from(phases).where(eq(phases.id, id)).limit(1);
    if (!updated) return Response.json({ error: "Fase não encontrada." }, { status: 404 });
    saved = updated;
  } else {
    const [updated] = await context.db.update(phases).set(update).where(eq(phases.id, id)).returning();
    if (!updated) return Response.json({ error: "Fase não encontrada." }, { status: 404 });
    saved = updated;
  }
  if (!cancellationPlan && (editing || body.approve)) await recordAuditEvent(context.db, { organizationId: saved.organizationId ?? undefined, personalSpaceId: saved.organizationId ? undefined : context.space.id, actorUserId: context.user.id, actorName: context.user.displayName, action: body.approve ? "phase_approved" : "phase_edited", subjectType: "phase", subjectId: id, summary: body.approve ? `aprovou a Fase “${saved.title}”.` : `editou a Fase “${saved.title}”.` });
  if (saved.status === "awaiting_approval" && phase.status !== "awaiting_approval") await recordApprovalRequested(context.db, { organizationId: saved.organizationId, personalSpaceId: saved.organizationId ? null : context.space.id, actorUserId: context.user.id, actorName: context.user.displayName, subjectType: "phase", subjectId: id, title: saved.title, previousStatus: phase.status as WorkState });
  if (body.status !== undefined || body.approve) await refreshProcessCompletionForItem(context, id);
  return Response.json({ phase: response(saved) });
}
