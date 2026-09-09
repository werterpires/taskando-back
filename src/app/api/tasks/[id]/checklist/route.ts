import { asc, eq } from "drizzle-orm";
import { ensurePersonalContext } from "../../../../../db/current-user";
import { checklistItems, tasks } from "../../../../../db/schema";
import { canAccessTask } from "../../../../../db/authorization";

async function getOwnedTask(id: string) {
  const context = await ensurePersonalContext();
  if (!context) return { context: null, task: null };
  const [task] = await context.db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, id)).limit(1);
  return { context, task: task && await canAccessTask(context.db, context.user.id, id, context.space.id, "interact") ? task : null };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { context, task } = await getOwnedTask(id);
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  if (!task) return Response.json({ error: "Tarefa não encontrada." }, { status: 404 });
  const items = await context.db.select().from(checklistItems).where(eq(checklistItems.taskId, id)).orderBy(asc(checklistItems.position), asc(checklistItems.createdAt));
  return Response.json({ items });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { context, task } = await getOwnedTask(id);
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  if (!task) return Response.json({ error: "Tarefa não encontrada." }, { status: 404 });
  const payload = (await request.json()) as { title?: string };
  const title = payload.title?.trim() ?? "";
  if (!title || title.length > 240) return Response.json({ error: "Informe um item de até 240 caracteres." }, { status: 400 });
  const existing = await context.db.select({ position: checklistItems.position }).from(checklistItems).where(eq(checklistItems.taskId, id)).orderBy(asc(checklistItems.position));
  const [item] = await context.db.insert(checklistItems).values({ id: crypto.randomUUID(), taskId: id, title, position: (existing.at(-1)?.position ?? 0) + 1 }).returning();
  return Response.json({ item }, { status: 201 });
}
