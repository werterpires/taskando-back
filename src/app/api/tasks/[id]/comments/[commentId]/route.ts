import { and, eq } from "drizzle-orm";
import { recordAuditEvent } from "../../../../../../db/audit";
import { canAccessTask } from "../../../../../../db/authorization";
import { ensurePersonalContext } from "../../../../../../db/current-user";
import { taskComments, tasks } from "../../../../../../db/schema";

async function getComment(taskId: string, commentId: string) {
  const context = await ensurePersonalContext();
  if (!context) return { context: null, task: null, comment: null };
  const [task] = await context.db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  const allowed = task && await canAccessTask(context.db, context.user.id, taskId, context.space.id, "interact");
  const [comment] = allowed ? await context.db.select().from(taskComments).where(and(eq(taskComments.id, commentId), eq(taskComments.taskId, taskId))).limit(1) : [];
  return { context, task: allowed ? task : null, comment: comment ?? null };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const { id, commentId } = await params; const { context, task, comment } = await getComment(id, commentId);
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  if (!task || !comment || comment.deletedAt || comment.authorUserId !== context.user.id) return Response.json({ error: "Você não pode editar este comentário." }, { status: 403 });
  const payload = await request.json() as { body?: string }; const body = payload.body?.trim() ?? "";
  if (!body || body.length > 3000) return Response.json({ error: "Escreva um comentário de até 3.000 caracteres." }, { status: 400 });
  const now = new Date().toISOString(); const [updated] = await context.db.update(taskComments).set({ body, editedAt: now, updatedAt: now }).where(eq(taskComments.id, commentId)).returning();
  await recordAuditEvent(context.db, { personalSpaceId: task.organizationId ? null : context.space.id, organizationId: task.organizationId, actorUserId: context.user.id, actorName: context.user.displayName, action: "comment_edited", subjectType: "task", subjectId: id, summary: `editou um comentário na tarefa “${task.title}”.` });
  return Response.json({ comment: { ...updated, canEdit: true, canDelete: true } });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const { id, commentId } = await params; const { context, task, comment } = await getComment(id, commentId);
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  if (!task || !comment || comment.deletedAt || (comment.authorUserId !== context.user.id && task.ownerUserId !== context.user.id && task.authorUserId !== context.user.id)) return Response.json({ error: "Você não pode remover este comentário." }, { status: 403 });
  const now = new Date().toISOString(); await context.db.update(taskComments).set({ deletedAt: now, updatedAt: now }).where(eq(taskComments.id, commentId));
  await recordAuditEvent(context.db, { personalSpaceId: task.organizationId ? null : context.space.id, organizationId: task.organizationId, actorUserId: context.user.id, actorName: context.user.displayName, action: "comment_deleted", subjectType: "task", subjectId: id, summary: `removeu um comentário da tarefa “${task.title}”.` });
  return Response.json({ id: commentId, deletedAt: now });
}
