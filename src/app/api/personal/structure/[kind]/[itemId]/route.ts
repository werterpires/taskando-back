import { and, eq } from "drizzle-orm";
import { ensurePersonalContext } from "../../../../../../db/current-user";
import { departments, hierarchyAttachments, organizations, teams } from "../../../../../../db/schema";
import { validateAttachment } from "../../../../../../db/hierarchy";
import { canAccessOrganization } from "../../../../../../db/authorization";

export async function PATCH(request: Request, { params }: { params: Promise<{ kind: string; itemId: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { kind, itemId } = await params;
  if (kind !== "department" && kind !== "team") return Response.json({ error: "Tipo inválido." }, { status: 400 });
  const table = kind === "department" ? departments : teams;
  const payload = (await request.json()) as { name?: string; description?: string; status?: "active" | "inactive"; parentType?: "organization" | "department" | null; parentId?: string | null };
  const update: { name?: string; description?: string; status?: "active" | "inactive"; organizationId?: string | null; updatedAt: string } = { updatedAt: new Date().toISOString() };
  if (payload.name !== undefined) { const name = payload.name.trim().replace(/\s+/g, " "); if (!name || name.length > 100) return Response.json({ error: "Nome inválido." }, { status: 400 }); update.name = name; }
  if (payload.description !== undefined) { const description = payload.description.trim(); if (description.length > 500) return Response.json({ error: "Descrição inválida." }, { status: 400 }); update.description = description; }
  if (payload.status !== undefined) { if (payload.status !== "active" && payload.status !== "inactive") return Response.json({ error: "Status inválido." }, { status: 400 }); update.status = payload.status; }
  const hasParentChange = payload.parentType !== undefined || payload.parentId !== undefined;
  if (Object.keys(update).length === 1 && !hasParentChange) return Response.json({ error: "Nenhuma alteração recebida." }, { status: 400 });
  const [existing] = await context.db.select().from(table).where(and(eq(table.id, itemId), eq(table.ownerUserId, context.user.id))).limit(1);
  if (!existing || existing.organizationId !== null) return Response.json({ error: "Item pessoal não encontrado." }, { status: 404 });
  if (hasParentChange) {
    const parentType = payload.parentType ?? null; const parentId = payload.parentId ?? null;
    if (kind === "department" && parentType !== null && parentType !== "organization") return Response.json({ error: "Departamento só pode ficar em uma Organização ou na Área pessoal." }, { status: 400 });
    if (kind === "team" && parentType !== null && parentType !== "organization" && parentType !== "department") return Response.json({ error: "Destino inválido." }, { status: 400 });
    if (parentType === "organization") { const allowed = await canAccessOrganization(context.db, context.user.id, context.user.email, parentId!, "edit"); if (!allowed) return Response.json({ error: "Você não pode criar itens na organização de destino." }, { status: 403 }); update.organizationId = parentId!; }
    if (parentType === "department") { const [parent] = await context.db.select().from(departments).where(eq(departments.id, parentId!)).limit(1); if (!parent) return Response.json({ error: "Departamento pai inválido." }, { status: 400 }); const allowed = parent.ownerUserId === context.user.id || (parent.organizationId !== null && await canAccessOrganization(context.db, context.user.id, context.user.email, parent.organizationId, "edit")); if (!allowed) return Response.json({ error: "Você não pode criar itens no departamento de destino." }, { status: 403 }); update.organizationId = parent.organizationId; }
    if (parentType === null) update.organizationId = null;
    const hierarchyError = validateAttachment(kind, itemId, parentType, parentId); if (hierarchyError) return Response.json({ error: hierarchyError }, { status: 400 });
  }
  try {
    const [item] = await context.db.update(table).set(update).where(eq(table.id, itemId)).returning();
    if (hasParentChange) { const parentType = payload.parentType ?? null; const parentId = payload.parentId ?? null; await context.db.insert(hierarchyAttachments).values({ id: crypto.randomUUID(), childType: kind, childId: itemId, parentType, parentId, updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: [hierarchyAttachments.childType, hierarchyAttachments.childId], set: { parentType, parentId, updatedAt: new Date().toISOString() } }); }
    return Response.json({ item });
  } catch { return Response.json({ error: "Não foi possível salvar." }, { status: 409 }); }
}
