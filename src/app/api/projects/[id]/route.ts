import { and, eq } from "drizzle-orm";
import { canAccessProject, canAccessOrganization, canItem } from "../../../../db/authorization";
import { recordAuditEvent } from "../../../../db/audit";
import { ensurePersonalContext } from "../../../../db/current-user";
import { departments, hierarchyAttachments, projects, teams } from "../../../../db/schema";
import { validateAttachment } from "../../../../db/hierarchy";
import { statusAfterApprovalConfiguration } from "../../../../db/approval";
import { recordApprovalRequested } from "../../../../db/approval-audit";
import type { WorkState } from "../../../../db/task-state";

const statuses = ["planned", "todo", "in_progress", "awaiting_approval", "completed", "cancelled", "archived"] as const;
const sizes = ["xs", "s", "m", "l", "xl"] as const;
const priorities = ["low", "medium", "high"] as const;
type ParentType = "organization" | "department" | "team" | null;

async function targetFor(context: NonNullable<Awaited<ReturnType<typeof ensurePersonalContext>>>, parentType: ParentType, parentId: string | null) {
  if (!parentType && !parentId) return { organizationId: null, allowed: true };
  if (!parentType || !parentId) return { organizationId: null, allowed: false };
  if (parentType === "organization") return { organizationId: parentId, allowed: await canAccessOrganization(context.db, context.user.id, context.user.email, parentId, "add_children") };
  const table = parentType === "department" ? departments : teams;
  const [parent] = await context.db.select().from(table).where(eq(table.id, parentId)).limit(1);
  if (!parent) return { organizationId: null, allowed: false };
  const allowed = parent.ownerUserId === context.user.id || await canItem(context.db, context.user.id, parentType, parentId, "add_children") || (parent.organizationId !== null && await canAccessOrganization(context.db, context.user.id, context.user.email, parent.organizationId, "add_children"));
  return { organizationId: parent.organizationId, allowed };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  const [project] = await context.db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project || !await canAccessProject(context.db, context.user.id, id, context.space.id, "view")) return Response.json({ error: "Projeto não encontrado." }, { status: 404 });
  const payload = await request.json() as { title?: string; description?: string; status?: typeof statuses[number]; approvalRequired?: boolean; approve?: boolean; size?: typeof sizes[number] | null; importance?: typeof priorities[number] | null; urgency?: typeof priorities[number] | null; move?: boolean; parentType?: ParentType; parentId?: string | null };
  if (payload.move !== undefined && typeof payload.move !== "boolean") return Response.json({ error: "Comando de movimentação inválido." }, { status: 400 });
  const isMove = payload.move === true;
  const canEdit = project.ownerUserId === context.user.id || await canItem(context.db, context.user.id, "project", id, "edit");
  const hasEditPayload = payload.title !== undefined || payload.description !== undefined || payload.status !== undefined || payload.approvalRequired !== undefined || payload.size !== undefined || payload.importance !== undefined || payload.urgency !== undefined;
  if (hasEditPayload && !canEdit) return Response.json({ error: "Você não pode editar este projeto." }, { status: 403 });
  if (isMove && project.ownerUserId !== context.user.id) return Response.json({ error: "Somente o Owner pode mover este projeto." }, { status: 403 });
  if (payload.status && !statuses.includes(payload.status)) return Response.json({ error: "Status de projeto inválido." }, { status: 400 });
  if (payload.size !== undefined && payload.size !== null && !sizes.includes(payload.size)) return Response.json({ error: "Tamanho de projeto inválido." }, { status: 400 });
  if (payload.importance !== undefined && payload.importance !== null && !priorities.includes(payload.importance)) return Response.json({ error: "Importância de projeto inválida." }, { status: 400 });
  if (payload.urgency !== undefined && payload.urgency !== null && !priorities.includes(payload.urgency)) return Response.json({ error: "Urgência de projeto inválida." }, { status: 400 });
  if (payload.approvalRequired !== undefined && typeof payload.approvalRequired !== "boolean") return Response.json({ error: "Configuração de aprovação inválida." }, { status: 400 });
  if (payload.approve) {
    if (!project.approvalRequired || project.status !== "awaiting_approval") return Response.json({ error: "Este projeto não está aguardando aprovação." }, { status: 400 });
    if (!(await canItem(context.db, context.user.id, "project", id, "approve")) && project.ownerUserId !== context.user.id) return Response.json({ error: "Você não pode aprovar este projeto." }, { status: 403 });
  }
  const update: Partial<typeof projects.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (payload.title !== undefined) { const title = payload.title.trim().replace(/\s+/g, " "); if (!title || title.length > 140) return Response.json({ error: "Informe um título de até 140 caracteres." }, { status: 400 }); update.title = title; }
  if (payload.description !== undefined) update.description = payload.description.trim();
  if (payload.approvalRequired !== undefined) update.approvalRequired = payload.approvalRequired;
  if (payload.status !== undefined) update.status = statusAfterApprovalConfiguration(payload.status, payload.approvalRequired ?? project.approvalRequired);
  if (payload.approvalRequired === false && project.approvalRequired && project.status === "awaiting_approval" && payload.status === undefined) update.status = "in_progress";
  if (payload.approve) { update.status = "completed"; update.approvedAt = new Date().toISOString(); update.approvedByUserId = context.user.id; }
  if (payload.size !== undefined) update.size = payload.size;
  if (payload.importance !== undefined) update.importance = payload.importance;
  if (payload.urgency !== undefined) update.urgency = payload.urgency;
  let organizationId = project.organizationId;
  if (isMove) {
    const parentType = payload.parentType ?? null; const parentId = payload.parentId ?? null;
    if (parentType !== null && parentType !== "organization" && parentType !== "department" && parentType !== "team") return Response.json({ error: "Pai de projeto inválido." }, { status: 400 });
    const attachmentError = validateAttachment("project", id, parentType, parentId);
    if (attachmentError) return Response.json({ error: attachmentError }, { status: 400 });
    const target = await targetFor(context, parentType, parentId);
    if (!target.allowed) return Response.json({ error: "Você não pode mover o projeto para este local." }, { status: 403 });
    organizationId = target.organizationId; update.organizationId = organizationId;
    await context.db.insert(hierarchyAttachments).values({ id: crypto.randomUUID(), childType: "project", childId: id, parentType, parentId, updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: [hierarchyAttachments.childType, hierarchyAttachments.childId], set: { parentType, parentId, updatedAt: new Date().toISOString() } });
  }
  const [saved] = await context.db.update(projects).set(update).where(eq(projects.id, id)).returning();
  if (isMove) await recordAuditEvent(context.db, { organizationId: organizationId ?? undefined, personalSpaceId: organizationId ? undefined : context.space.id, actorUserId: context.user.id, actorName: context.user.displayName, action: "project_moved", subjectType: "project", subjectId: id, summary: `moveu o projeto “${saved.title}”.` });
  else if (hasEditPayload) await recordAuditEvent(context.db, { organizationId: saved.organizationId ?? undefined, personalSpaceId: saved.organizationId ? undefined : context.space.id, actorUserId: context.user.id, actorName: context.user.displayName, action: "project_edited", subjectType: "project", subjectId: id, summary: `editou o projeto “${saved.title}”.` });
  if (saved.status === "awaiting_approval" && project.status !== "awaiting_approval") await recordApprovalRequested(context.db, { organizationId: saved.organizationId, personalSpaceId: saved.organizationId ? null : context.space.id, actorUserId: context.user.id, actorName: context.user.displayName, subjectType: "project", subjectId: id, title: saved.title, previousStatus: project.status as WorkState });
  return Response.json({ project: saved });
}
