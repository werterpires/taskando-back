import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { canAccessTask } from "../../../../../db/authorization";
import { ensurePersonalContext } from "../../../../../db/current-user";
import { taskListTasks, taskLists, tasks } from "../../../../../db/schema";
import { hydrateTaskRows } from "../../../../../db/task-view";
import { parseWorkStatusFilter, workStatusCondition } from "../../../../../db/work-status-filter";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  const [list] = await context.db.select({ id: taskLists.id }).from(taskLists).where(and(eq(taskLists.id, id), eq(taskLists.personalSpaceId, context.space.id))).limit(1);
  if (!list) return Response.json({ error: "Lista não encontrada." }, { status: 404 });
  const parsed = parseWorkStatusFilter(request);
  if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 });
  const memberships = await context.db.select({ taskId: taskListTasks.taskId }).from(taskListTasks).where(eq(taskListTasks.listId, id));
  if (!memberships.length) return Response.json({ tasks: [] });
  const candidates = await context.db.select().from(tasks).where(and(inArray(tasks.id, memberships.map((membership) => membership.taskId)), isNull(tasks.deletedAt), workStatusCondition(tasks.status, parsed.filter))).orderBy(desc(tasks.createdAt));
  const visible = await Promise.all(candidates.map(async (task) => await canAccessTask(context.db, context.user.id, task.id, context.space.id, "view") ? task : null));
  const rows = visible.filter((task): task is typeof candidates[number] => task !== null);
  return Response.json({ tasks: await hydrateTaskRows(context, rows) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  const payload = (await request.json()) as { taskId?: string; taskIds?: string[] };
  const taskIds = [...new Set(payload.taskIds ?? (payload.taskId ? [payload.taskId] : []))];
  if (!taskIds.length || taskIds.length > 100) return Response.json({ error: "Selecione de 1 a 100 tarefas." }, { status: 400 });
  const [listRows, access] = await Promise.all([
    context.db.select({ id: taskLists.id }).from(taskLists).where(and(eq(taskLists.id, id), eq(taskLists.personalSpaceId, context.space.id))).limit(1),
    Promise.all(taskIds.map((taskId) => canAccessTask(context.db, context.user.id, taskId, context.space.id, "view"))),
  ]);
  if (!listRows[0] || access.some((allowed) => !allowed)) return Response.json({ error: "Lista ou tarefa não encontrada." }, { status: 404 });
  for (const taskId of taskIds) await context.db.insert(taskListTasks).values({ listId: id, taskId }).onConflictDoNothing();
  return Response.json({ taskIds }, { status: 201 });
}
