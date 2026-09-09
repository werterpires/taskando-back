import { and, eq } from "drizzle-orm";
import { ensurePersonalContext } from "../../../../../../db/current-user";
import { checklistItems, tasks } from "../../../../../../db/schema";
import { canAccessTask } from "../../../../../../db/authorization";

async function getOwnedItem(taskId: string, itemId: string) {
  const context = await ensurePersonalContext();
  if (!context) return { context: null, item: null };
  const [item] = await context.db.select({ id: checklistItems.id }).from(checklistItems).innerJoin(tasks, eq(checklistItems.taskId, tasks.id)).where(and(eq(checklistItems.id, itemId), eq(checklistItems.taskId, taskId))).limit(1);
  return { context, item: item && await canAccessTask(context.db, context.user.id, taskId, context.space.id, "interact") ? item : null };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  const { context, item } = await getOwnedItem(id, itemId);
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  if (!item) return Response.json({ error: "Item não encontrado." }, { status: 404 });
  const payload = (await request.json()) as { title?: string; completed?: boolean };
  const update: Partial<typeof checklistItems.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (payload.title !== undefined) { const title = payload.title.trim(); if (!title || title.length > 240) return Response.json({ error: "Informe um item de até 240 caracteres." }, { status: 400 }); update.title = title; }
  if (payload.completed !== undefined) { if (typeof payload.completed !== "boolean") return Response.json({ error: "Estado inválido." }, { status: 400 }); update.completed = payload.completed; }
  if (Object.keys(update).length === 1) return Response.json({ error: "Nenhuma alteração recebida." }, { status: 400 });
  const [updated] = await context.db.update(checklistItems).set(update).where(eq(checklistItems.id, itemId)).returning();
  return Response.json({ item: updated });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  const { context, item } = await getOwnedItem(id, itemId);
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  if (!item) return Response.json({ error: "Item não encontrado." }, { status: 404 });
  await context.db.delete(checklistItems).where(eq(checklistItems.id, itemId));
  return Response.json({ id: itemId });
}
