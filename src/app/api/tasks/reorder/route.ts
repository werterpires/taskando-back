import { and, eq, isNull } from "drizzle-orm";
import { ensurePersonalContext } from "../../../../db/current-user";
import { tasks } from "../../../../db/schema";

export async function POST(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const payload = (await request.json()) as { view?: "inbox" | "today"; taskIds?: string[] };
  if ((payload.view !== "inbox" && payload.view !== "today") || !Array.isArray(payload.taskIds) || !payload.taskIds.length || new Set(payload.taskIds).size !== payload.taskIds.length) return Response.json({ error: "Ordem inválida." }, { status: 400 });
  const allowed = await context.db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.personalSpaceId, context.space.id), isNull(tasks.deletedAt)));
  const allowedIds = new Set(allowed.map((task) => task.id));
  if (payload.taskIds.some((id) => !allowedIds.has(id))) return Response.json({ error: "Você não pode ordenar uma destas tarefas." }, { status: 403 });
  const updatedAt = new Date().toISOString();
  for (const [index, id] of payload.taskIds.entries()) {
    const position = index + 1;
    await context.db.update(tasks).set(payload.view === "inbox" ? { inboxPosition: position, updatedAt } : { todayPosition: position, updatedAt }).where(eq(tasks.id, id));
  }
  return Response.json({ view: payload.view, taskIds: payload.taskIds });
}
