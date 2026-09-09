import { and, eq } from "drizzle-orm";
import { effectiveCapabilities, grants, roles, type Capability, type ItemRole } from "../../../db/capabilities";
import { ensurePersonalContext } from "../../../db/current-user";
import { canItem } from "../../../db/authorization";
import { departments, fronts, hierarchyAttachments, itemInvitations, itemRoleAssignments, phases, processes, products, projects, tasks, teams, users } from "../../../db/schema";

const itemTypes = ["department", "team", "project", "front", "product", "process", "phase", "task"] as const;
type ItemType = typeof itemTypes[number];
type Context = NonNullable<Awaited<ReturnType<typeof ensurePersonalContext>>>;
type ItemInfo = { ownerUserId: string | null; organizationId: string | null; name: string; parentType: string | null; parentId: string | null };
const emailIsValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

async function getItem(context: Context, itemType: ItemType, itemId: string): Promise<ItemInfo | null> {
  const table = itemType === "department" ? departments : itemType === "team" ? teams : itemType === "project" ? projects : itemType === "front" ? fronts : itemType === "product" ? products : itemType === "process" ? processes : itemType === "phase" ? phases : tasks;
  const [item] = await context.db.select().from(table).where(eq(table.id, itemId)).limit(1);
  if (!item) return null;
  if (itemType === "task") return { ownerUserId: item.ownerUserId ?? ("authorUserId" in item ? item.authorUserId : null), organizationId: item.organizationId, name: "title" in item ? item.title : item.name, parentType: null, parentId: null };
  const [attachment] = await context.db.select().from(hierarchyAttachments).where(and(eq(hierarchyAttachments.childType, itemType), eq(hierarchyAttachments.childId, itemId))).limit(1);
  if (itemType === "project" || itemType === "front" || itemType === "product" || itemType === "process" || itemType === "phase") return { ownerUserId: item.ownerUserId, organizationId: item.organizationId, name: "title" in item ? item.title : item.name, parentType: attachment?.parentType ?? null, parentId: attachment?.parentId ?? null };
  return { ownerUserId: item.ownerUserId, organizationId: item.organizationId, name: "name" in item ? item.name : item.title, parentType: attachment?.parentType ?? null, parentId: attachment?.parentId ?? null };
}

async function inheritedVisibility(context: Context, item: ItemInfo) {
  const sources: string[] = []; let parentType = item.parentType; let parentId = item.parentId;
  while (parentType && parentId) {
    const rows = await context.db.select({ role: itemRoleAssignments.role }).from(itemRoleAssignments).where(and(eq(itemRoleAssignments.itemType, parentType as typeof itemRoleAssignments.$inferSelect.itemType), eq(itemRoleAssignments.itemId, parentId), eq(itemRoleAssignments.userId, context.user.id)));
    if (effectiveCapabilities(rows.map((row) => row.role as ItemRole)).has("view_children")) sources.push(parentType === "organization" ? "Organização" : parentType === "department" ? "Departamento pai" : "Item pai");
    const [attachment] = await context.db.select().from(hierarchyAttachments).where(and(eq(hierarchyAttachments.childType, parentType as typeof hierarchyAttachments.$inferSelect.childType), eq(hierarchyAttachments.childId, parentId))).limit(1);
    parentType = attachment?.parentType ?? null; parentId = attachment?.parentId ?? null;
  }
  return sources;
}

async function canManage(context: Context, itemType: ItemType, itemId: string, item: ItemInfo) { return item.ownerUserId === context.user.id || canItem(context.db, context.user.id, itemType, itemId, "add_members"); }

export async function GET(request: Request) {
  const context = await ensurePersonalContext(); if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const url = new URL(request.url); const itemType = url.searchParams.get("itemType") as ItemType | null; const itemId = url.searchParams.get("itemId");
  if (!itemType || !itemId || !itemTypes.includes(itemType)) return Response.json({ error: "Item inválido." }, { status: 400 });
  const item = await getItem(context, itemType, itemId); if (!item) return Response.json({ error: "Item não encontrado." }, { status: 404 });
  const assignments = await context.db.select({ id: itemRoleAssignments.id, userId: itemRoleAssignments.userId, role: itemRoleAssignments.role, displayName: users.displayName, email: users.email }).from(itemRoleAssignments).innerJoin(users, eq(itemRoleAssignments.userId, users.id)).where(and(eq(itemRoleAssignments.itemType, itemType), eq(itemRoleAssignments.itemId, itemId)));
  const invitations = await context.db.select({ id: itemInvitations.id, email: itemInvitations.email, role: itemInvitations.role, status: itemInvitations.status }).from(itemInvitations).where(and(eq(itemInvitations.itemType, itemType), eq(itemInvitations.itemId, itemId), eq(itemInvitations.status, "pending")));
  const directRoles = assignments.filter((row) => row.userId === context.user.id).map((row) => row.role as ItemRole);
  const inheritedFrom = await inheritedVisibility(context, item); const manager = await canManage(context, itemType, itemId, item);
  if (!manager && !effectiveCapabilities(directRoles).has("view") && inheritedFrom.length === 0) return Response.json({ error: "Sem acesso a este item." }, { status: 403 });
  const capabilityReasons: Partial<Record<Capability, string[]>> = {};
  for (const role of directRoles) for (const capability of grants[role]) capabilityReasons[capability] = [...(capabilityReasons[capability] ?? []), `Papel direto: ${role}.`];
  if (inheritedFrom.length) capabilityReasons.view = [...(capabilityReasons.view ?? []), ...inheritedFrom.map((source) => `Visibilidade via ${source.toLowerCase()}; somente consulta do item.`)];
  const owner = assignments.find((assignment) => assignment.userId === item.ownerUserId) ?? { id: `owner-${item.ownerUserId}`, userId: item.ownerUserId, role: "owner", displayName: (await context.db.select({ displayName: users.displayName }).from(users).where(eq(users.id, item.ownerUserId ?? "")).limit(1))[0]?.displayName ?? "Owner", email: "" };
  const responsibles = assignments.filter((assignment) => assignment.role === "executor");
  return Response.json({ itemName: item.name, assignments, invitations, owner, responsibles, directRoles, inheritedFrom, capabilities: [...new Set([...(inheritedFrom.length ? ["view"] : []), ...effectiveCapabilities(directRoles)])], capabilityReasons, canManage: manager });
}

export async function POST(request: Request) {
  const context = await ensurePersonalContext(); if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const body = await request.json() as { itemType?: ItemType; itemId?: string; email?: string; role?: ItemRole };
  const email = (body.email ?? "").trim().toLowerCase();
  if (!body.itemType || !body.itemId || !email || !body.role || !itemTypes.includes(body.itemType) || !roles.includes(body.role) || !emailIsValid(email)) return Response.json({ error: "Convite inválido." }, { status: 400 });
  if (body.role === "owner") return Response.json({ error: "Owner é único e não pode ser convidado." }, { status: 400 });
  const item = await getItem(context, body.itemType, body.itemId); if (!item) return Response.json({ error: "Item não encontrado." }, { status: 404 });
  if (!await canManage(context, body.itemType, body.itemId, item)) return Response.json({ error: "Você não pode convidar pessoas neste item." }, { status: 403 });
  const now = new Date().toISOString();
  const [invitation] = await context.db.insert(itemInvitations).values({ id: crypto.randomUUID(), itemType: body.itemType, itemId: body.itemId, email, role: body.role, status: "pending", updatedAt: now }).onConflictDoUpdate({ target: [itemInvitations.itemType, itemInvitations.itemId, itemInvitations.email], set: { role: body.role, status: "pending", userId: null, updatedAt: now } }).returning();
  return Response.json({ invitation }, { status: 201 });
}

export async function DELETE(request: Request) {
  const context = await ensurePersonalContext(); if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const url = new URL(request.url); const itemType = url.searchParams.get("itemType") as ItemType | null; const itemId = url.searchParams.get("itemId"); const userId = url.searchParams.get("userId"); const role = url.searchParams.get("role") as ItemRole | null; const invitationId = url.searchParams.get("invitationId");
  if (!itemType || !itemId || !itemTypes.includes(itemType)) return Response.json({ error: "Item inválido." }, { status: 400 });
  const item = await getItem(context, itemType, itemId); if (!item) return Response.json({ error: "Item não encontrado." }, { status: 404 });
  if (!await canManage(context, itemType, itemId, item)) return Response.json({ error: "Você não pode remover pessoas neste item." }, { status: 403 });
  if (invitationId) { await context.db.update(itemInvitations).set({ status: "removed", updatedAt: new Date().toISOString() }).where(and(eq(itemInvitations.id, invitationId), eq(itemInvitations.itemType, itemType), eq(itemInvitations.itemId, itemId))); return Response.json({ ok: true }); }
  if (!userId || !role) return Response.json({ error: "Atribuição inválida." }, { status: 400 });
  if (role === "owner") return Response.json({ error: "O Owner não pode ser removido." }, { status: 400 });
  await context.db.delete(itemRoleAssignments).where(and(eq(itemRoleAssignments.itemType, itemType), eq(itemRoleAssignments.itemId, itemId), eq(itemRoleAssignments.userId, userId), eq(itemRoleAssignments.role, role)));
  return Response.json({ ok: true });
}
