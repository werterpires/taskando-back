import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { ensurePersonalContext } from "../../../../../db/current-user";
import { canAccessTask } from "../../../../../db/authorization";
import { canBeSubtask, canHaveSubtasks, commitmentFitsDueDate, commitmentTimeError, dateMarkerError, eventFitsDueDate, eventTimeError, taskTypeLabels, taskTypes, type TaskType } from "../../../../../db/task-types";
import { taskAssignees, tasks, users } from "../../../../../db/schema";

const childTypes: TaskType[] = ["simple", "commitment", "date", "event"];

async function loadParent(id: string) {
  const context = await ensurePersonalContext();
  if (!context) return { context: null, parent: null, allowed: false };
  const [parent] = await context.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  const allowed = Boolean(parent && await canAccessTask(context.db, context.user.id, id, context.space.id, "interact"));
  return { context, parent: parent ?? null, allowed };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { context, parent, allowed } = await loadParent(id);
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  if (!parent || !allowed) return Response.json({ error: "Você não tem acesso a esta tarefa." }, { status: 403 });
  if (!canHaveSubtasks(parent.taskType as TaskType)) return Response.json({ subtasks: [] });
  const rows = await context.db.select().from(tasks).where(and(eq(tasks.parentTaskId, id), isNull(tasks.deletedAt))).orderBy(asc(tasks.subtaskPosition), asc(tasks.createdAt));
  const ids = rows.map((row) => row.id);
  const assignments = ids.length ? await context.db.select({ taskId: taskAssignees.taskId, userId: users.id, displayName: users.displayName }).from(taskAssignees).innerJoin(users, eq(taskAssignees.userId, users.id)).where(inArray(taskAssignees.taskId, ids)) : [];
  return Response.json({ subtasks: rows.map((row) => ({ ...row, assignees: assignments.filter((item) => item.taskId === row.id).map(({ userId, displayName }) => ({ userId, displayName })) })) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { context, parent, allowed } = await loadParent(id);
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  if (!parent || !allowed) return Response.json({ error: "Você não pode criar subtarefas nesta tarefa." }, { status: 403 });
  if (parent.parentTaskId) return Response.json({ error: "Subtarefas não podem ter subtarefas." }, { status: 400 });
  if (!canHaveSubtasks(parent.taskType as TaskType)) return Response.json({ error: `Tarefas do tipo ${taskTypeLabels[parent.taskType as TaskType]} não podem ter subtarefas.` }, { status: 400 });
  const payload = await request.json() as { title?: string; taskType?: string; dueDate?: string | null; dateAt?: string | null; startAt?: string | null; endAt?: string | null; durationMinutes?: number | null };
  const title = payload.title?.trim() ?? ""; const taskType = payload.taskType ?? "simple"; const dueDate = payload.dueDate?.trim() || null;
  if (!title) return Response.json({ error: "Informe o título da subtarefa." }, { status: 400 });
  if (!taskTypes.includes(taskType as TaskType) || !childTypes.includes(taskType as TaskType) || !canBeSubtask(taskType as TaskType)) return Response.json({ error: "Este tipo não pode ser usado como subtarefa. Escolha Simples, Compromisso, Data ou Evento." }, { status: 400 });
  const timeError = commitmentTimeError(taskType, payload.startAt, payload.durationMinutes);
  if (timeError) return Response.json({ error: timeError }, { status: 400 });
  const eventError = eventTimeError(taskType, payload.startAt, payload.endAt);
  if (eventError) return Response.json({ error: eventError }, { status: 400 });
  const dateError = dateMarkerError(taskType, payload.dateAt);
  if (dateError) return Response.json({ error: dateError }, { status: 400 });
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return Response.json({ error: "Use uma data válida." }, { status: 400 });
  if (dueDate && parent.dueDate && dueDate > parent.dueDate) return Response.json({ error: "O prazo da subtarefa não pode ultrapassar o prazo da tarefa-pai." }, { status: 400 });
  if (taskType === "date" && parent.dueDate && payload.dateAt! > parent.dueDate) return Response.json({ error: "A data da subtarefa não pode ultrapassar o prazo da tarefa-pai." }, { status: 400 });
  if (taskType === "commitment" && parent.dueDate && !commitmentFitsDueDate(payload.startAt!, payload.durationMinutes!, parent.dueDate)) return Response.json({ error: "O compromisso da subtarefa não pode terminar após o prazo da tarefa-pai." }, { status: 400 });
  if (taskType === "event" && parent.dueDate && !eventFitsDueDate(payload.endAt!, parent.dueDate)) return Response.json({ error: "O evento da subtarefa não pode terminar após o prazo da tarefa-pai." }, { status: 400 });
  const [last] = await context.db.select({ position: tasks.subtaskPosition }).from(tasks).where(eq(tasks.parentTaskId, id)).orderBy(asc(tasks.subtaskPosition), asc(tasks.createdAt)).limit(1);
  const count = (await context.db.select({ id: tasks.id }).from(tasks).where(eq(tasks.parentTaskId, id))).length;
  const [subtask] = await context.db.insert(tasks).values({ id: crypto.randomUUID(), personalSpaceId: parent.personalSpaceId, authorUserId: context.user.id, ownerUserId: context.user.id, organizationId: parent.organizationId, title, description: "", taskType: taskType as typeof tasks.$inferInsert.taskType, status: "todo", approvalRequired: false, dueDate, dateAt: taskType === "date" ? payload.dateAt! : null, startAt: taskType === "commitment" || taskType === "event" ? payload.startAt! : null, endAt: taskType === "event" ? payload.endAt! : null, durationMinutes: taskType === "commitment" ? payload.durationMinutes! : null, parentTaskId: id, subtaskPosition: last?.position === null || last?.position === undefined ? count + 1 : count + 1 }).returning();
  return Response.json({ subtask }, { status: 201 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { context, parent, allowed } = await loadParent(id);
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  if (!parent || !allowed) return Response.json({ error: "Você não pode ordenar subtarefas nesta tarefa." }, { status: 403 });
  const payload = await request.json() as { orderedIds?: string[] };
  if (!Array.isArray(payload.orderedIds) || payload.orderedIds.length !== new Set(payload.orderedIds).size) return Response.json({ error: "Ordem de subtarefas inválida." }, { status: 400 });
  const rows = await context.db.select({ id: tasks.id }).from(tasks).where(eq(tasks.parentTaskId, id));
  if (rows.length !== payload.orderedIds.length || rows.some((row) => !payload.orderedIds!.includes(row.id))) return Response.json({ error: "A ordem deve conter todas as subtarefas." }, { status: 400 });
  await context.db.batch(payload.orderedIds.map((subtaskId, index) => context.db.update(tasks).set({ subtaskPosition: index + 1, updatedAt: new Date().toISOString() }).where(and(eq(tasks.id, subtaskId), eq(tasks.parentTaskId, id)))));
  return Response.json({ ok: true });
}
