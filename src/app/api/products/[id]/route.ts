import { and, eq } from "drizzle-orm";
import { canAccessProduct, canItem } from "../../../../db/authorization";
import { recordAuditEvent } from "../../../../db/audit";
import { ensurePersonalContext } from "../../../../db/current-user";
import { validateAttachment } from "../../../../db/hierarchy";
import { hierarchyAttachments, products } from "../../../../db/schema";
import { targetForProduct, cleanProductCharacteristics, productResponse, productStatuses, productSizes, productPriorities, type ProductParentType } from "../shared";
import { statusAfterApprovalConfiguration } from "../../../../db/approval";
import { recordApprovalRequested } from "../../../../db/approval-audit";
import type { WorkState } from "../../../../db/task-state";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext(); if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params; const [product] = await context.db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!product || !await canAccessProduct(context.db, context.user.id, id, context.space.id, "view")) return Response.json({ error: "Produto não encontrado." }, { status: 404 });
  const [attachment] = await context.db.select().from(hierarchyAttachments).where(and(eq(hierarchyAttachments.childType, "product"), eq(hierarchyAttachments.childId, id))).limit(1);
  return Response.json({ product: { ...productResponse(product), parentType: attachment?.parentType ?? null, parentId: attachment?.parentId ?? null } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext(); if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params; const [product] = await context.db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!product || !await canAccessProduct(context.db, context.user.id, id, context.space.id, "view")) return Response.json({ error: "Produto não encontrado." }, { status: 404 });
  const payload = await request.json() as { title?: string; description?: string; status?: typeof productStatuses[number]; size?: typeof productSizes[number] | null; importance?: typeof productPriorities[number] | null; urgency?: typeof productPriorities[number] | null; approvalRequired?: boolean; characteristics?: { key: string; value: string }[]; parentType?: ProductParentType; parentId?: string | null; approve?: boolean };
  const moving = payload.parentType !== undefined || payload.parentId !== undefined;
  const editing = payload.title !== undefined || payload.description !== undefined || payload.status !== undefined || payload.size !== undefined || payload.importance !== undefined || payload.urgency !== undefined || payload.approvalRequired !== undefined || payload.characteristics !== undefined;
  if (editing && product.ownerUserId !== context.user.id && !await canItem(context.db, context.user.id, "product", id, "edit")) return Response.json({ error: "Você não pode editar este produto." }, { status: 403 });
  if (moving && product.ownerUserId !== context.user.id) return Response.json({ error: "Somente o Owner pode mover este produto." }, { status: 403 });
  if (payload.approve) { if (!product.approvalRequired || product.status !== "awaiting_approval") return Response.json({ error: "Este produto não está aguardando aprovação." }, { status: 400 }); if (product.ownerUserId !== context.user.id && !await canItem(context.db, context.user.id, "product", id, "approve")) return Response.json({ error: "Você não pode aprovar este produto." }, { status: 403 }); }
  if (payload.status !== undefined && !productStatuses.includes(payload.status)) return Response.json({ error: "Status de produto inválido." }, { status: 400 });
  if (payload.size !== undefined && payload.size !== null && !productSizes.includes(payload.size)) return Response.json({ error: "Tamanho de produto inválido." }, { status: 400 });
  if ((payload.importance !== undefined && payload.importance !== null && !productPriorities.includes(payload.importance)) || (payload.urgency !== undefined && payload.urgency !== null && !productPriorities.includes(payload.urgency))) return Response.json({ error: "Prioridade de produto inválida." }, { status: 400 });
  if (payload.approvalRequired !== undefined && typeof payload.approvalRequired !== "boolean") return Response.json({ error: "Configuração de aprovação inválida." }, { status: 400 });
  const characteristics = payload.characteristics === undefined ? null : cleanProductCharacteristics(payload.characteristics); if (payload.characteristics !== undefined && !characteristics) return Response.json({ error: "Cada característica precisa ter chave e valor válidos." }, { status: 400 });
  const update: Partial<typeof products.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (payload.title !== undefined) { const title = payload.title.trim().replace(/\s+/g, " "); if (!title || title.length > 140) return Response.json({ error: "Informe um título de até 140 caracteres." }, { status: 400 }); update.title = title; }
  if (payload.description !== undefined) update.description = payload.description.trim(); if (payload.size !== undefined) update.size = payload.size; if (payload.importance !== undefined) update.importance = payload.importance; if (payload.urgency !== undefined) update.urgency = payload.urgency; if (payload.approvalRequired !== undefined) update.approvalRequired = payload.approvalRequired; if (characteristics) update.characteristicsJson = JSON.stringify(characteristics);
  const approvalRequired = payload.approvalRequired ?? product.approvalRequired;
  if (payload.status !== undefined) update.status = statusAfterApprovalConfiguration(payload.status, approvalRequired);
  if (payload.approvalRequired === false && product.approvalRequired && product.status === "awaiting_approval" && payload.status === undefined) update.status = "in_progress";
  if (payload.approve) { update.status = "completed"; update.approvedAt = new Date().toISOString(); update.approvedByUserId = context.user.id; }
  let organizationId = product.organizationId;
  if (moving) { const parentType = payload.parentType ?? null; const parentId = payload.parentId ?? null; if (parentType !== null && !["organization", "department", "team", "project", "front"].includes(parentType)) return Response.json({ error: "Pai de produto inválido." }, { status: 400 }); const hierarchyError = validateAttachment("product", id, parentType, parentId); if (hierarchyError) return Response.json({ error: hierarchyError }, { status: 400 }); const target = await targetForProduct(context, parentType, parentId); if (!target.allowed) return Response.json({ error: "Você não pode mover o produto para este local." }, { status: 403 }); organizationId = target.organizationId; update.organizationId = organizationId; await context.db.insert(hierarchyAttachments).values({ id: crypto.randomUUID(), childType: "product", childId: id, parentType, parentId, updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: [hierarchyAttachments.childType, hierarchyAttachments.childId], set: { parentType, parentId, updatedAt: new Date().toISOString() } }); }
  const [saved] = await context.db.update(products).set(update).where(eq(products.id, id)).returning();
  const action = payload.approve ? "product_approved" : moving ? "product_moved" : "product_edited";
  if (editing || moving || payload.approve) await recordAuditEvent(context.db, { organizationId: organizationId ?? undefined, personalSpaceId: organizationId ? undefined : context.space.id, actorUserId: context.user.id, actorName: context.user.displayName, action, subjectType: "product", subjectId: id, summary: payload.approve ? `aprovou o produto “${saved.title}”.` : moving ? `moveu o produto “${saved.title}”.` : `editou o produto “${saved.title}”.` });
  if (saved.status === "awaiting_approval" && product.status !== "awaiting_approval") await recordApprovalRequested(context.db, { organizationId: saved.organizationId, personalSpaceId: saved.organizationId ? null : context.space.id, actorUserId: context.user.id, actorName: context.user.displayName, subjectType: "product", subjectId: id, title: saved.title, previousStatus: product.status as WorkState });
  return Response.json({ product: productResponse(saved) });
}
