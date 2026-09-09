import { and, desc, eq, isNotNull } from "drizzle-orm";
import { recordAuditEvent } from "../../../../db/audit";
import { ensurePersonalContext } from "../../../../db/current-user";
import { tasks } from "../../../../db/schema";
import { TASK_SOFT_DELETE_RETENTION_DAYS, taskRetentionUntil } from "../../../../db/task-retention";

export async function GET() {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const rows = await context.db.select({
    id: tasks.id,
    title: tasks.title,
    taskType: tasks.taskType,
    deletedAt: tasks.deletedAt,
    deletedStatus: tasks.deletedStatus,
    ownerUserId: tasks.ownerUserId,
    organizationId: tasks.organizationId,
  }).from(tasks).where(and(isNotNull(tasks.deletedAt), eq(tasks.ownerUserId, context.user.id))).orderBy(desc(tasks.deletedAt));
  return Response.json({
    tasks: rows.map((task) => ({ ...task, retentionUntil: task.deletedAt ? taskRetentionUntil(task.deletedAt) : null })),
    retentionDays: TASK_SOFT_DELETE_RETENTION_DAYS,
    retentionPolicy: "A tarefa permanece na lixeira por no mínimo 30 dias; relações e histórico são preservados.",
  });
}

export async function POST(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const payload = await request.json() as { id?: string };
  if (!payload.id || typeof payload.id !== "string") return Response.json({ error: "Informe a tarefa a restaurar." }, { status: 400 });
  const [task] = await context.db.select().from(tasks).where(and(eq(tasks.id, payload.id), isNotNull(tasks.deletedAt))).limit(1);
  if (!task) return Response.json({ error: "Tarefa não encontrada na lixeira." }, { status: 404 });
  if (task.ownerUserId !== context.user.id) return Response.json({ error: "Somente o Owner pode restaurar esta tarefa." }, { status: 403 });
  if (task.parentTaskId) {
    const [parent] = await context.db.select({ id: tasks.id, deletedAt: tasks.deletedAt }).from(tasks).where(eq(tasks.id, task.parentTaskId)).limit(1);
    if (!parent || parent.deletedAt) return Response.json({ error: "A tarefa-mãe não está disponível; restaure a hierarquia antes desta tarefa." }, { status: 409 });
  }
  const restoredAt = new Date().toISOString();
  const [restored] = await context.db.update(tasks).set({ deletedAt: null, deletedStatus: null, status: task.deletedStatus ?? "todo", updatedAt: restoredAt }).where(and(eq(tasks.id, task.id), isNotNull(tasks.deletedAt))).returning({ id: tasks.id, title: tasks.title, status: tasks.status });
  if (!restored) return Response.json({ error: "A tarefa já foi restaurada ou não está disponível." }, { status: 409 });
  await recordAuditEvent(context.db, {
    personalSpaceId: task.organizationId ? null : context.space.id,
    organizationId: task.organizationId,
    actorUserId: context.user.id,
    actorName: context.user.displayName,
    action: "task_restored",
    subjectType: "task",
    subjectId: restored.id,
    summary: `restaurou a tarefa “${restored.title}” da lixeira.`,
  });
  return Response.json({ task: restored, message: "Tarefa restaurada; suas relações foram mantidas." });
}
