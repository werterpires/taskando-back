import { and, asc, eq } from "drizzle-orm";
import { ensurePersonalContext } from "../../../../../db/current-user";
import { departments, hierarchyAttachments, organizationMembers, organizations, teams } from "../../../../../db/schema";
import { canAccessOrganization } from "../../../../../db/authorization";

async function getOrganizationAccess(id: string) {
  const context = await ensurePersonalContext();
  if (!context) return { context: null, organization: null, isOwner: false };
  const [organization] = await context.db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  if (!organization) return { context, organization: null, isOwner: false };
  const isOwner = organization.ownerUserId === context.user.id;
  if (!isOwner) {
    const [membership] = await context.db.select({ id: organizationMembers.id }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, id), eq(organizationMembers.email, context.user.email.toLowerCase()), eq(organizationMembers.status, "active"))).limit(1);
    if (!membership) return { context, organization: null, isOwner: false };
  }
  return { context, organization, isOwner: isOwner || await canAccessOrganization(context.db, context.user.id, context.user.email, id, "edit") };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { context, organization, isOwner } = await getOrganizationAccess(id);
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  if (!organization) return Response.json({ error: "Organização não encontrada ou sem acesso." }, { status: 404 });
  const [departmentItems, teamItems, attachments] = await Promise.all([
    context.db.select().from(departments).where(eq(departments.organizationId, id)).orderBy(asc(departments.name)),
    context.db.select().from(teams).where(eq(teams.organizationId, id)).orderBy(asc(teams.name)),
    context.db.select().from(hierarchyAttachments),
  ]);
  const attachmentByChild = new Map(attachments.map((item) => [`${item.childType}:${item.childId}`, item]));
  const isAttachedHere = (kind: "department" | "team", itemId: string) => attachmentByChild.get(`${kind}:${itemId}`)?.parentType !== null;
  const visibleDepartments = departmentItems.filter((item) => isAttachedHere("department", item.id));
  const visibleTeams = teamItems.filter((item) => isAttachedHere("team", item.id));
  const parentByChild = Object.fromEntries([...visibleDepartments, ...visibleTeams].map((item) => {
    const kind = visibleDepartments.some((department) => department.id === item.id) ? "department" : "team";
    const attachment = attachmentByChild.get(`${kind}:${item.id}`);
    return [`${kind}:${item.id}`, attachment ? { parentType: attachment.parentType, parentId: attachment.parentId } : { parentType: "organization", parentId: id }];
  }));
  return Response.json({ departments: visibleDepartments, teams: visibleTeams, parentByChild, canManage: isOwner });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { context, organization, isOwner } = await getOrganizationAccess(id);
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  if (!organization) return Response.json({ error: "Organização não encontrada ou sem acesso." }, { status: 404 });
  if (!isOwner) return Response.json({ error: "Somente o Owner pode criar itens de estrutura." }, { status: 403 });
  const payload = (await request.json()) as { kind?: "department" | "team"; name?: string; description?: string; status?: "active" | "inactive"; parentType?: "organization" | "department"; parentId?: string };
  const name = payload.name?.trim().replace(/\s+/g, " ") ?? "";
  const description = payload.description?.trim() ?? "";
  if (payload.kind !== "department" && payload.kind !== "team") return Response.json({ error: "Tipo de estrutura inválido." }, { status: 400 });
  if (!name || name.length > 100 || description.length > 500) return Response.json({ error: "Use nome de até 100 e descrição de até 500 caracteres." }, { status: 400 });
  if (payload.status && payload.status !== "active" && payload.status !== "inactive") return Response.json({ error: "Status inválido." }, { status: 400 });
  const parentType = payload.parentType ?? "organization"; const parentId = payload.parentId ?? id;
  if (payload.kind === "department" && (parentType !== "organization" || parentId !== id)) return Response.json({ error: "Departamento deve ser criado diretamente na organização." }, { status: 400 });
  if (payload.kind === "team" && parentType === "department") { const [parent] = await context.db.select({ id: departments.id }).from(departments).where(and(eq(departments.id, parentId), eq(departments.organizationId, id))).limit(1); if (!parent) return Response.json({ error: "Departamento inválido." }, { status: 400 }); }
  if (payload.kind === "team" && parentType !== "organization" && parentType !== "department") return Response.json({ error: "Local do time inválido." }, { status: 400 });
  const table = payload.kind === "department" ? departments : teams;
  try {
    const [item] = await context.db.insert(table).values({ id: crypto.randomUUID(), organizationId: id, ownerUserId: context.user.id, name, description, status: payload.status ?? "active" }).returning();
    await context.db.insert(hierarchyAttachments).values({ id: crypto.randomUUID(), childType: payload.kind, childId: item.id, parentType, parentId });
    return Response.json({ item }, { status: 201 });
  } catch {
    return Response.json({ error: "Já existe um item com esse nome nesta organização." }, { status: 409 });
  }
}
