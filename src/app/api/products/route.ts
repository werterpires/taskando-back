import { asc, eq } from "drizzle-orm";
import { canAccessFront, canAccessOrganization, canAccessProduct, canAccessProject, canItem } from "../../../db/authorization";
import { recordAuditEvent } from "../../../db/audit";
import { ensurePersonalContext } from "../../../db/current-user";
import { validateAttachment } from "../../../db/hierarchy";
import { parentNamesByChild } from "../../../db/parent-labels";
import { departments, fronts, hierarchyAttachments, itemRoleAssignments, products, projects, teams } from "../../../db/schema";

const statuses = ["planned", "todo", "in_progress", "awaiting_approval", "completed", "cancelled", "archived"] as const;
const sizes = ["xs", "s", "m", "l", "xl"] as const;
const priorities = ["low", "medium", "high"] as const;
type ParentType = "organization" | "department" | "team" | "project" | "front" | null;
type Characteristic = { key: string; value: string };
type Context = NonNullable<Awaited<ReturnType<typeof ensurePersonalContext>>>;

const cleanCharacteristics = (value: unknown): Characteristic[] | null => {
  if (!Array.isArray(value) || value.length > 30) return null;
  const items = value.map((item) => ({ key: typeof item?.key === "string" ? item.key.trim().replace(/\s+/g, " ") : "", value: typeof item?.value === "string" ? item.value.trim().replace(/\s+/g, " ") : "" })).filter((item) => item.key || item.value);
  if (items.some((item) => !item.key || !item.value || item.key.length > 80 || item.value.length > 240)) return null;
  return items;
};
const toResponse = (product: typeof products.$inferSelect) => ({ ...product, characteristics: (() => { try { const value = JSON.parse(product.characteristicsJson); return Array.isArray(value) ? value : []; } catch { return []; } })() as Characteristic[] });

async function targetFor(context: Context, parentType: ParentType, parentId: string | null) {
  if (!parentType && !parentId) return { organizationId: null, allowed: true };
  if (!parentType || !parentId) return { organizationId: null, allowed: false };
  if (parentType === "organization") return { organizationId: parentId, allowed: await canAccessOrganization(context.db, context.user.id, context.user.email, parentId, "add_children") };
  if (parentType === "project") { const [parent] = await context.db.select().from(projects).where(eq(projects.id, parentId)).limit(1); return { organizationId: parent?.organizationId ?? null, allowed: Boolean(parent && await canAccessProject(context.db, context.user.id, parentId, context.space.id, "add_children")) }; }
  if (parentType === "front") { const [parent] = await context.db.select().from(fronts).where(eq(fronts.id, parentId)).limit(1); return { organizationId: parent?.organizationId ?? null, allowed: Boolean(parent && await canAccessFront(context.db, context.user.id, parentId, context.space.id, "add_children")) }; }
  const table = parentType === "department" ? departments : teams;
  const [parent] = await context.db.select().from(table).where(eq(table.id, parentId)).limit(1);
  const allowed = Boolean(parent && (parent.ownerUserId === context.user.id || await canItem(context.db, context.user.id, parentType, parentId, "add_children") || (parent.organizationId !== null && await canAccessOrganization(context.db, context.user.id, context.user.email, parent.organizationId, "add_children"))));
  return { organizationId: parent?.organizationId ?? null, allowed };
}

export async function GET() {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const candidates = await context.db.select().from(products).orderBy(asc(products.createdAt));
  const visible = await Promise.all(candidates.map(async (product) => await canAccessProduct(context.db, context.user.id, product.id, context.space.id, "view") ? product : null));
  const attachments = await context.db.select().from(hierarchyAttachments);
  const names = await parentNamesByChild(context.db, attachments);
  return Response.json({ products: visible.filter((product): product is typeof candidates[number] => product !== null).map((product) => { const attachment = attachments.find((item) => item.childType === "product" && item.childId === product.id); return { ...toResponse(product), parentType: attachment?.parentType ?? null, parentId: attachment?.parentId ?? null, parentName: names.get(`product:${product.id}`) ?? null }; }) });
}

export async function POST(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const payload = await request.json() as { title?: string; description?: string; status?: typeof statuses[number]; size?: typeof sizes[number] | null; importance?: typeof priorities[number] | null; urgency?: typeof priorities[number] | null; approvalRequired?: boolean; characteristics?: Characteristic[]; parentType?: ParentType; parentId?: string | null };
  const title = payload.title?.trim().replace(/\s+/g, " ") ?? "";
  const parentType = payload.parentType ?? null; const parentId = payload.parentId ?? null;
  const characteristics = cleanCharacteristics(payload.characteristics ?? []);
  if (!title || title.length > 140) return Response.json({ error: "Informe um título de até 140 caracteres." }, { status: 400 });
  if (payload.status && !statuses.includes(payload.status)) return Response.json({ error: "Status de produto inválido." }, { status: 400 });
  if (payload.size !== undefined && payload.size !== null && !sizes.includes(payload.size)) return Response.json({ error: "Tamanho de produto inválido." }, { status: 400 });
  if ((payload.importance !== undefined && payload.importance !== null && !priorities.includes(payload.importance)) || (payload.urgency !== undefined && payload.urgency !== null && !priorities.includes(payload.urgency))) return Response.json({ error: "Prioridade de produto inválida." }, { status: 400 });
  if (typeof payload.approvalRequired !== "undefined" && typeof payload.approvalRequired !== "boolean") return Response.json({ error: "Configuração de aprovação inválida." }, { status: 400 });
  if (!characteristics) return Response.json({ error: "Cada característica precisa ter chave e valor válidos." }, { status: 400 });
  if (parentType !== null && !["organization", "department", "team", "project", "front"].includes(parentType)) return Response.json({ error: "Pai de produto inválido." }, { status: 400 });
  const hierarchyError = validateAttachment("product", "novo", parentType, parentId); if (hierarchyError) return Response.json({ error: hierarchyError }, { status: 400 });
  const target = await targetFor(context, parentType, parentId); if (!target.allowed) return Response.json({ error: "Você não pode criar um produto neste local." }, { status: 403 });
  const approvalRequired = payload.approvalRequired ?? false; const requestedStatus = payload.status ?? "planned"; const status = approvalRequired && requestedStatus === "completed" ? "awaiting_approval" : requestedStatus;
  const [product] = await context.db.insert(products).values({ id: crypto.randomUUID(), personalSpaceId: context.space.id, organizationId: target.organizationId, ownerUserId: context.user.id, authorUserId: context.user.id, title, description: payload.description?.trim() ?? "", status, approvalRequired, characteristicsJson: JSON.stringify(characteristics), size: payload.size ?? null, importance: payload.importance ?? null, urgency: payload.urgency ?? null }).returning();
  await context.db.insert(hierarchyAttachments).values({ id: crypto.randomUUID(), childType: "product", childId: product.id, parentType, parentId });
  await context.db.insert(itemRoleAssignments).values({ id: crypto.randomUUID(), itemType: "product", itemId: product.id, userId: context.user.id, role: "owner" });
  await recordAuditEvent(context.db, { organizationId: target.organizationId ?? undefined, personalSpaceId: target.organizationId ? undefined : context.space.id, actorUserId: context.user.id, actorName: context.user.displayName, action: "product_created", subjectType: "product", subjectId: product.id, summary: `criou o produto “${product.title}”.` });
  return Response.json({ product: toResponse(product) }, { status: 201 });
}
