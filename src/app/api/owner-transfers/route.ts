import { and, desc, eq } from "drizzle-orm";
import { canItem } from "../../../db/authorization";
import { ensurePersonalContext } from "../../../db/current-user";
import { eligibleOwnerCandidates, getOwnerTransferItem, ownerTransferItemTypes, ownerTransferTypeLabel, ownerUpdateStatement, type OwnerTransferItem, type OwnerTransferItemType } from "../../../db/owner-transfers";
import { auditEvents, hierarchyAttachments, itemRoleAssignments, organizationMembers, ownerTransferRequests, users } from "../../../db/schema";

type Context = NonNullable<Awaited<ReturnType<typeof ensurePersonalContext>>>;
type TransferAction = "accept" | "decline" | "cancel";

async function person(context: Context, userId: string) {
  const [entry] = await context.db.select({ id: users.id, displayName: users.displayName, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  return entry ?? { id: userId, displayName: "Pessoa", email: "" };
}

async function canViewTransferItem(context: Context, item: OwnerTransferItem) {
  if (item.ownerUserId === context.user.id || item.authorUserId === context.user.id) return true;
  if (await canItem(context.db, context.user.id, item.type, item.id, "view")) return true;
  if (!item.organizationId) return item.personalSpaceId === context.space.id;
  const [membership] = await context.db.select({ id: organizationMembers.id }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, item.organizationId), eq(organizationMembers.userId, context.user.id), eq(organizationMembers.status, "active"))).limit(1);
  return Boolean(membership);
}

async function hasSuperiorOwner(context: Context, item: OwnerTransferItem) {
  let type: OwnerTransferItemType = item.type; let id = item.id;
  for (let depth = 0; depth < 8; depth += 1) {
    const [link] = await context.db.select().from(hierarchyAttachments).where(and(eq(hierarchyAttachments.childType, type as typeof hierarchyAttachments.$inferSelect.childType), eq(hierarchyAttachments.childId, id))).limit(1);
    if (!link?.parentType || !link.parentId || link.parentType === "organization" && type === "organization") return false;
    const parent = await getOwnerTransferItem(context, link.parentType as OwnerTransferItemType, link.parentId);
    if (parent?.ownerUserId === context.user.id) return true;
    if (!parent) return false;
    type = parent.type; id = parent.id;
  }
  return false;
}

async function responseRequest(context: Context, request: typeof ownerTransferRequests.$inferSelect, item?: OwnerTransferItem | null) {
  const loaded = item ?? await getOwnerTransferItem(context, request.itemType, request.itemId);
  const [currentOwner, proposedOwner] = await Promise.all([person(context, request.currentOwnerUserId), person(context, request.proposedOwnerUserId)]);
  return {
    id: request.id,
    itemType: request.itemType,
    itemId: request.itemId,
    itemName: loaded?.name ?? "Item indisponível",
    itemTypeLabel: ownerTransferTypeLabel[request.itemType],
    status: request.status,
    currentOwner,
    proposedOwner,
    createdAt: request.createdAt,
    canAccept: request.status === "pending" && request.proposedOwnerUserId === context.user.id,
    canDecline: request.status === "pending" && request.proposedOwnerUserId === context.user.id,
    canCancel: request.status === "pending" && request.requestedByUserId === context.user.id,
  };
}

export async function GET(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const url = new URL(request.url);
  if (url.searchParams.get("inbox") === "1") {
    const rows = await context.db.select().from(ownerTransferRequests).where(and(eq(ownerTransferRequests.proposedOwnerUserId, context.user.id), eq(ownerTransferRequests.status, "pending"))).orderBy(desc(ownerTransferRequests.createdAt)).limit(50);
    return Response.json({ requests: await Promise.all(rows.map((entry) => responseRequest(context, entry))) });
  }
  const itemType = url.searchParams.get("itemType") as OwnerTransferItemType | null;
  const itemId = url.searchParams.get("itemId");
  if (!itemType || !itemId || !ownerTransferItemTypes.includes(itemType)) return Response.json({ error: "Item inválido." }, { status: 400 });
  const item = await getOwnerTransferItem(context, itemType, itemId);
  if (!item) return Response.json({ error: "Item não encontrado ou ainda não possui Owner." }, { status: 404 });
  const [pending] = await context.db.select().from(ownerTransferRequests).where(and(eq(ownerTransferRequests.itemType, itemType), eq(ownerTransferRequests.itemId, itemId), eq(ownerTransferRequests.status, "pending"))).orderBy(desc(ownerTransferRequests.createdAt)).limit(1);
  const involved = pending && (pending.requestedByUserId === context.user.id || pending.proposedOwnerUserId === context.user.id);
  if (!involved && !await canViewTransferItem(context, item)) return Response.json({ error: "Sem acesso a este item." }, { status: 403 });
  const [currentOwner, candidates, canExceptionRequest] = await Promise.all([person(context, item.ownerUserId), item.ownerUserId === context.user.id ? eligibleOwnerCandidates(context, item) : Promise.resolve([]), item.ownerUserId === context.user.id ? Promise.resolve(false) : hasSuperiorOwner(context, item)]);
  return Response.json({
    item: { type: item.type, id: item.id, name: item.name },
    currentOwner,
    canRequest: item.ownerUserId === context.user.id && !pending,
    canExceptionRequest: canExceptionRequest && !pending,
    candidates,
    pendingRequest: pending ? await responseRequest(context, pending, item) : null,
  });
}

export async function POST(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const body = await request.json() as { itemType?: OwnerTransferItemType; itemId?: string; proposedOwnerUserId?: string; mode?: "normal" | "exception" };
  if (!body.itemType || !body.itemId || !body.proposedOwnerUserId || !ownerTransferItemTypes.includes(body.itemType)) return Response.json({ error: "Solicitação inválida." }, { status: 400 });
  const item = await getOwnerTransferItem(context, body.itemType, body.itemId);
  if (!item) return Response.json({ error: "Item não encontrado ou ainda não possui Owner." }, { status: 404 });
  const exceptional = body.mode === "exception";
  if (!exceptional && item.ownerUserId !== context.user.id) return Response.json({ error: "Somente o Owner atual pode solicitar a transferência." }, { status: 403 });
  if (exceptional && !await hasSuperiorOwner(context, item)) return Response.json({ error: "Somente o Owner de um descendente válido pode fazer esta transferência excepcional." }, { status: 403 });
  if (body.proposedOwnerUserId === item.ownerUserId) return Response.json({ error: "Escolha outra pessoa para receber a propriedade." }, { status: 400 });
  const candidates = await eligibleOwnerCandidates(context, item);
  const proposed = candidates.find((candidate) => candidate.id === body.proposedOwnerUserId);
  if (!proposed) return Response.json({ error: "O destinatário precisa ter acesso ativo a este item." }, { status: 400 });
  if (exceptional) {
    const now = new Date().toISOString(); type BatchStatement = Parameters<typeof context.db.batch>[0][number];
    const statements: BatchStatement[] = [ownerUpdateStatement(context, item, proposed.id, now), context.db.delete(itemRoleAssignments).where(and(eq(itemRoleAssignments.itemType, item.type), eq(itemRoleAssignments.itemId, item.id), eq(itemRoleAssignments.role, "owner"))), context.db.insert(itemRoleAssignments).values({ id: crypto.randomUUID(), itemType: item.type, itemId: item.id, userId: proposed.id, role: "owner" }).onConflictDoNothing(), context.db.insert(auditEvents).values({ id: crypto.randomUUID(), organizationId: item.organizationId, personalSpaceId: item.organizationId ? null : item.personalSpaceId, actorUserId: context.user.id, actorName: context.user.displayName, action: "owner_transfer_exceptional", subjectType: item.type, subjectId: item.id, summary: `transferiu diretamente o Owner de “${item.name}” para ${proposed.displayName}, por autorização hierárquica excepcional.` })];
    await context.db.batch(statements as [BatchStatement, ...BatchStatement[]]);
    return Response.json({ status: "exceptional", message: `Owner de “${item.name}” transferido diretamente.` });
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const row = { id, itemType: item.type, itemId: item.id, currentOwnerUserId: item.ownerUserId, proposedOwnerUserId: proposed.id, requestedByUserId: context.user.id, status: "pending" as const, pendingKey: `${item.type}:${item.id}`, updatedAt: now };
  try {
    await context.db.batch([
      context.db.insert(ownerTransferRequests).values(row),
      context.db.insert(auditEvents).values({ id: crypto.randomUUID(), organizationId: item.organizationId, personalSpaceId: item.organizationId ? null : item.personalSpaceId, actorUserId: context.user.id, actorName: context.user.displayName, action: "owner_transfer_requested", subjectType: item.type, subjectId: item.id, summary: `solicitou a transferência de Owner de “${item.name}” para ${proposed.displayName}.` }),
    ]);
  } catch {
    return Response.json({ error: "Já existe uma transferência de Owner aguardando resposta para este item." }, { status: 409 });
  }
  const [saved] = await context.db.select().from(ownerTransferRequests).where(eq(ownerTransferRequests.id, id)).limit(1);
  return Response.json({ request: await responseRequest(context, saved, item) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const body = await request.json() as { id?: string; action?: TransferAction };
  if (!body.id || !body.action || !["accept", "decline", "cancel"].includes(body.action)) return Response.json({ error: "Decisão inválida." }, { status: 400 });
  const [transfer] = await context.db.select().from(ownerTransferRequests).where(eq(ownerTransferRequests.id, body.id)).limit(1);
  if (!transfer) return Response.json({ error: "Solicitação não encontrada." }, { status: 404 });
  if (transfer.status !== "pending") return Response.json({ error: "Esta solicitação já foi encerrada." }, { status: 409 });
  if (body.action === "cancel" && transfer.requestedByUserId !== context.user.id) return Response.json({ error: "Somente quem solicitou pode cancelar a transferência." }, { status: 403 });
  if ((body.action === "accept" || body.action === "decline") && transfer.proposedOwnerUserId !== context.user.id) return Response.json({ error: "Somente o destinatário pode responder à transferência." }, { status: 403 });
  const item = await getOwnerTransferItem(context, transfer.itemType, transfer.itemId);
  if (!item) return Response.json({ error: "Item não encontrado ou sem Owner." }, { status: 404 });
  if (item.ownerUserId !== transfer.currentOwnerUserId) return Response.json({ error: "O Owner do item mudou; esta solicitação não pode mais ser aplicada." }, { status: 409 });
  const now = new Date().toISOString();
  const proposed = await person(context, transfer.proposedOwnerUserId);
  const auditBase = { id: crypto.randomUUID(), organizationId: item.organizationId, personalSpaceId: item.organizationId ? null : item.personalSpaceId, actorUserId: context.user.id, actorName: context.user.displayName, subjectType: item.type, subjectId: item.id } as const;
  if (body.action === "accept") {
    const candidates = await eligibleOwnerCandidates(context, item);
    if (!candidates.some((candidate) => candidate.id === transfer.proposedOwnerUserId)) return Response.json({ error: "Seu acesso ao item não está mais ativo; peça ao Owner para enviar uma nova solicitação." }, { status: 409 });
    type BatchStatement = Parameters<typeof context.db.batch>[0][number];
    const statements: BatchStatement[] = [
      ownerUpdateStatement(context, item, transfer.proposedOwnerUserId, now),
      context.db.delete(itemRoleAssignments).where(and(eq(itemRoleAssignments.itemType, item.type), eq(itemRoleAssignments.itemId, item.id), eq(itemRoleAssignments.role, "owner"))),
      context.db.insert(itemRoleAssignments).values({ id: crypto.randomUUID(), itemType: item.type, itemId: item.id, userId: transfer.proposedOwnerUserId, role: "owner" }).onConflictDoNothing(),
      context.db.update(ownerTransferRequests).set({ status: "accepted", pendingKey: null, respondedAt: now, updatedAt: now }).where(and(eq(ownerTransferRequests.id, transfer.id), eq(ownerTransferRequests.status, "pending"))),
      context.db.insert(auditEvents).values({ ...auditBase, action: "owner_transfer_accepted", summary: `aceitou ser Owner de “${item.name}”; a propriedade saiu de ${transfer.currentOwnerUserId === context.user.id ? context.user.displayName : "quem solicitou"}.` }),
    ];
    if (item.type === "organization") {
      statements.splice(3, 0,
        context.db.update(organizationMembers).set({ role: "leader", updatedAt: now }).where(and(eq(organizationMembers.organizationId, item.id), eq(organizationMembers.userId, transfer.currentOwnerUserId))),
        context.db.update(organizationMembers).set({ role: "owner", status: "active", updatedAt: now }).where(and(eq(organizationMembers.organizationId, item.id), eq(organizationMembers.userId, transfer.proposedOwnerUserId))),
      );
    }
    await context.db.batch(statements as [BatchStatement, ...BatchStatement[]]);
    return Response.json({ status: "accepted", message: `Você agora é Owner de “${item.name}”.` });
  }
  const status = body.action === "decline" ? "declined" as const : "cancelled" as const;
  const action = body.action === "decline" ? "owner_transfer_declined" as const : "owner_transfer_cancelled" as const;
  const summary = body.action === "decline" ? `recusou a transferência de Owner de “${item.name}”; ${transfer.currentOwnerUserId === context.user.id ? "o Owner atual" : "o solicitante"} foi mantido.` : `cancelou a solicitação de transferência de Owner de “${item.name}” para ${proposed.displayName}.`;
  await context.db.batch([
    context.db.update(ownerTransferRequests).set({ status, pendingKey: null, respondedAt: now, updatedAt: now }).where(and(eq(ownerTransferRequests.id, transfer.id), eq(ownerTransferRequests.status, "pending"))),
    context.db.insert(auditEvents).values({ ...auditBase, action, summary }),
  ]);
  return Response.json({ status, message: body.action === "decline" ? "Transferência recusada. O Owner atual foi mantido." : "Solicitação cancelada. O Owner atual foi mantido." });
}
