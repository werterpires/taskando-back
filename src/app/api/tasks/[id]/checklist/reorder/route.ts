import { and, eq } from "drizzle-orm";
import { ensurePersonalContext } from "../../../../../../db/current-user";
import { checklistItems, tasks } from "../../../../../../db/schema";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const [task] = await context.db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, id), eq(tasks.personalSpaceId, context.space.id))).limit(1);
  if (!task) return Response.json({ error: "Tarefa não encontrada." }, { status: 404 });
  const payload = (await request.json()) as { itemIds?: string[] };
  if (!Array.isArray(payload.itemIds) || new Set(payload.itemIds).size !== payload.itemIds.length) return Response.json({ error: "Ordem inválida." }, { status: 400 });
  const items = await context.db.select({ id: checklistItems.id }).from(checklistItems).where(eq(checklistItems.taskId, id));
  if (items.length !== payload.itemIds.length || items.some((item) => !payload.itemIds!.includes(item.id))) return Response.json({ error: "A ordem deve incluir todos os itens." }, { status: 400 });
  const updatedAt = new Date().toISOString();
  for (const [index, itemId] of payload.itemIds.entries()) await context.db.update(checklistItems).set({ position: index + 1, updatedAt }).where(eq(checklistItems.id, itemId));
  return Response.json({ itemIds: payload.itemIds });
}
