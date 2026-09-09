import { eq } from "drizzle-orm";
import { canAccessFront, canAccessProject } from "../../../../../db/authorization";
import { recordAuditEvent } from "../../../../../db/audit";
import { ensurePersonalContext } from "../../../../../db/current-user";
import { fronts, hierarchyAttachments, itemRoleAssignments, projects } from "../../../../../db/schema";
import { statusAfterApprovalConfiguration } from "../../../../../db/approval";

const statuses = ["planned", "todo", "in_progress", "awaiting_approval", "completed", "cancelled", "archived"] as const;
const sizes = ["xs", "s", "m", "l", "xl"] as const;
const priorities = ["low", "medium", "high"] as const;

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  if (!await canAccessProject(context.db, context.user.id, id, context.space.id, "view")) return Response.json({ error: "Projeto não encontrado." }, { status: 404 });
  const candidates = await context.db.select().from(fronts).where(eq(fronts.projectId, id));
  const visible = await Promise.all(candidates.map(async (front) => await canAccessFront(context.db, context.user.id, front.id, context.space.id, "view") ? front : null));
  return Response.json({ fronts: visible.filter((front): front is typeof candidates[number] => front !== null) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  const [project] = await context.db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project || !await canAccessProject(context.db, context.user.id, id, context.space.id, "add_children")) return Response.json({ error: "Você não pode criar frentes neste projeto." }, { status: 403 });
  const payload = await request.json() as { title?: string; description?: string; status?: typeof statuses[number]; approvalRequired?: boolean; size?: typeof sizes[number] | null; importance?: typeof priorities[number] | null; urgency?: typeof priorities[number] | null };
  const title = payload.title?.trim().replace(/\s+/g, " ") ?? "";
  if (!title || title.length > 140) return Response.json({ error: "Informe um título de até 140 caracteres." }, { status: 400 });
  if (payload.status !== undefined && !statuses.includes(payload.status)) return Response.json({ error: "Status de frente inválido." }, { status: 400 });
  if (payload.size !== undefined && payload.size !== null && !sizes.includes(payload.size)) return Response.json({ error: "Tamanho de frente inválido." }, { status: 400 });
  if (payload.importance !== undefined && payload.importance !== null && !priorities.includes(payload.importance)) return Response.json({ error: "Importância de frente inválida." }, { status: 400 });
  if (payload.urgency !== undefined && payload.urgency !== null && !priorities.includes(payload.urgency)) return Response.json({ error: "Urgência de frente inválida." }, { status: 400 });
  if (payload.approvalRequired !== undefined && typeof payload.approvalRequired !== "boolean") return Response.json({ error: "Configuração de aprovação inválida." }, { status: 400 });
  const approvalRequired = payload.approvalRequired ?? false;
  const [front] = await context.db.insert(fronts).values({ id: crypto.randomUUID(), projectId: project.id, personalSpaceId: context.space.id, organizationId: project.organizationId, ownerUserId: context.user.id, authorUserId: context.user.id, title, description: payload.description?.trim() ?? "", status: statusAfterApprovalConfiguration(payload.status ?? "planned", approvalRequired), approvalRequired, size: payload.size ?? null, importance: payload.importance ?? null, urgency: payload.urgency ?? null }).returning();
  await context.db.insert(hierarchyAttachments).values({ id: crypto.randomUUID(), childType: "front", childId: front.id, parentType: "project", parentId: project.id });
  await context.db.insert(itemRoleAssignments).values({ id: crypto.randomUUID(), itemType: "front", itemId: front.id, userId: context.user.id, role: "owner" });
  await recordAuditEvent(context.db, { organizationId: project.organizationId ?? undefined, personalSpaceId: project.organizationId ? undefined : context.space.id, actorUserId: context.user.id, actorName: context.user.displayName, action: "front_created", subjectType: "front", subjectId: front.id, summary: `criou a frente “${front.title}” no projeto “${project.title}”.` });
  return Response.json({ front }, { status: 201 });
}
