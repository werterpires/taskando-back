import { asc, eq } from "drizzle-orm";
import { canAccessOrganization, canAccessProject, canItem } from "../../../db/authorization";
import { recordAuditEvent } from "../../../db/audit";
import { ensurePersonalContext } from "../../../db/current-user";
import { parentNamesByChild } from "../../../db/parent-labels";
import { departments, hierarchyAttachments, itemRoleAssignments, organizations, projects, teams } from "../../../db/schema";
import { validateAttachment } from "../../../db/hierarchy";
import { statusAfterApprovalConfiguration } from "../../../db/approval";

const statuses = ["planned", "todo", "in_progress", "awaiting_approval", "completed", "cancelled", "archived"] as const;
const sizes = ["xs", "s", "m", "l", "xl"] as const;
const priorities = ["low", "medium", "high"] as const;
type ProjectStatus = typeof statuses[number];
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

export async function GET() {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const candidates = await context.db.select().from(projects).orderBy(asc(projects.createdAt));
  const visible = await Promise.all(candidates.map(async (project) => await canAccessProject(context.db, context.user.id, project.id, context.space.id, "view") ? project : null));
  const attachments = await context.db.select().from(hierarchyAttachments);
  const parentNames = await parentNamesByChild(context.db, attachments);
  return Response.json({ projects: visible.filter((project): project is typeof candidates[number] => project !== null).map((project) => { const attachment = attachments.find((item) => item.childType === "project" && item.childId === project.id); return { ...project, parentType: attachment?.parentType ?? null, parentId: attachment?.parentId ?? null, parentName: parentNames.get(`project:${project.id}`) ?? null }; }) });
}

export async function POST(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const payload = await request.json() as { title?: string; description?: string; status?: ProjectStatus; approvalRequired?: boolean; size?: typeof sizes[number] | null; importance?: typeof priorities[number] | null; urgency?: typeof priorities[number] | null; parentType?: ParentType; parentId?: string | null };
  const title = payload.title?.trim().replace(/\s+/g, " ") ?? "";
  const parentType = payload.parentType ?? null; const parentId = payload.parentId ?? null;
  if (!title || title.length > 140) return Response.json({ error: "Informe um título de até 140 caracteres." }, { status: 400 });
  if (payload.status && !statuses.includes(payload.status)) return Response.json({ error: "Status de projeto inválido." }, { status: 400 });
  if (payload.size !== undefined && payload.size !== null && !sizes.includes(payload.size)) return Response.json({ error: "Tamanho de projeto inválido." }, { status: 400 });
  if (payload.importance !== undefined && payload.importance !== null && !priorities.includes(payload.importance)) return Response.json({ error: "Importância de projeto inválida." }, { status: 400 });
  if (payload.urgency !== undefined && payload.urgency !== null && !priorities.includes(payload.urgency)) return Response.json({ error: "Urgência de projeto inválida." }, { status: 400 });
  if (payload.approvalRequired !== undefined && typeof payload.approvalRequired !== "boolean") return Response.json({ error: "Configuração de aprovação inválida." }, { status: 400 });
  if (parentType !== null && parentType !== "organization" && parentType !== "department" && parentType !== "team") return Response.json({ error: "Pai de projeto inválido." }, { status: 400 });
  const attachmentError = validateAttachment("project", "novo", parentType, parentId);
  if (attachmentError) return Response.json({ error: attachmentError }, { status: 400 });
  const target = await targetFor(context, parentType, parentId);
  if (!target.allowed) return Response.json({ error: "Você não pode criar um projeto neste local." }, { status: 403 });
  const approvalRequired = payload.approvalRequired ?? false;
  const [project] = await context.db.insert(projects).values({ id: crypto.randomUUID(), personalSpaceId: context.space.id, organizationId: target.organizationId, ownerUserId: context.user.id, authorUserId: context.user.id, title, description: payload.description?.trim() ?? "", status: statusAfterApprovalConfiguration(payload.status ?? "planned", approvalRequired), approvalRequired, size: payload.size ?? null, importance: payload.importance ?? null, urgency: payload.urgency ?? null }).returning();
  await context.db.insert(hierarchyAttachments).values({ id: crypto.randomUUID(), childType: "project", childId: project.id, parentType, parentId });
  await context.db.insert(itemRoleAssignments).values({ id: crypto.randomUUID(), itemType: "project", itemId: project.id, userId: context.user.id, role: "owner" });
  await recordAuditEvent(context.db, { organizationId: target.organizationId ?? undefined, personalSpaceId: target.organizationId ? undefined : context.space.id, actorUserId: context.user.id, actorName: context.user.displayName, action: "project_created", subjectType: "project", subjectId: project.id, summary: `criou o projeto “${project.title}”.` });
  return Response.json({ project }, { status: 201 });
}
