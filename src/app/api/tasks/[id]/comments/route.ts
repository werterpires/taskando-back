import { asc, eq } from "drizzle-orm";
import { recordAuditEvent } from "../../../../../db/audit";
import { canAccessTask } from "../../../../../db/authorization";
import { ensurePersonalContext } from "../../../../../db/current-user";
import { taskAssignees, taskComments, tasks, users } from "../../../../../db/schema";
import { createNotification } from "../../../../../db/notifications";

async function getTask(id: string, capability: "view" | "interact") {
  const context = await ensurePersonalContext();
  if (!context) return { context: null, task: null };
  const [task] = await context.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return { context, task: task && await canAccessTask(context.db, context.user.id, id, context.space.id, capability) ? task : null };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { context, task } = await getTask(id, "view");
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  if (!task) return Response.json({ error: "Tarefa não encontrada." }, { status: 404 });
  const rows = await context.db.select({ id: taskComments.id, body: taskComments.body, authorUserId: taskComments.authorUserId, authorName: users.displayName, createdAt: taskComments.createdAt, editedAt: taskComments.editedAt, deletedAt: taskComments.deletedAt }).from(taskComments).innerJoin(users, eq(taskComments.authorUserId, users.id)).where(eq(taskComments.taskId, id)).orderBy(asc(taskComments.createdAt));
  const canInteract = await canAccessTask(context.db, context.user.id, id, context.space.id, "interact");
  return Response.json({ comments: rows.map((comment) => ({ ...comment, canEdit: canInteract && comment.authorUserId === context.user.id && !comment.deletedAt, canDelete: canInteract && !comment.deletedAt && (comment.authorUserId === context.user.id || task.ownerUserId === context.user.id || task.authorUserId === context.user.id) })), canComment: canInteract });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { context, task } = await getTask(id, "interact");
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  if (!task) return Response.json({ error: "Você não pode comentar nesta tarefa." }, { status: 403 });
  const payload = await request.json() as { body?: string }; const body = payload.body?.trim() ?? "";
  if (!body || body.length > 3000) return Response.json({ error: "Escreva um comentário de até 3.000 caracteres." }, { status: 400 });
  const [comment] = await context.db.insert(taskComments).values({ id: crypto.randomUUID(), taskId: id, authorUserId: context.user.id, body }).returning();
  const recipients = await context.db.select({ userId: taskAssignees.userId }).from(taskAssignees).where(eq(taskAssignees.taskId, id));
  for (const recipient of recipients) await createNotification(context.db, { recipientUserId: recipient.userId, actorUserId: context.user.id, taskId: id, type: "comment", eventKey: `comment:${comment.id}:${recipient.userId}`, summary: `${context.user.displayName} comentou na tarefa “${task.title}”.` });
  const mentionedEmails = [...new Set([...body.matchAll(/@([\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/g)].map((match) => match[1].toLowerCase()))];
  for (const email of mentionedEmails) { const [mentioned] = await context.db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1); if (mentioned && await canAccessTask(context.db, mentioned.id, id, context.space.id, "view")) await createNotification(context.db, { recipientUserId: mentioned.id, actorUserId: context.user.id, taskId: id, type: "mention", eventKey: `mention:${comment.id}:${mentioned.id}`, summary: `${context.user.displayName} mencionou você na tarefa “${task.title}”.` }); }
  await recordAuditEvent(context.db, { personalSpaceId: task.organizationId ? null : context.space.id, organizationId: task.organizationId, actorUserId: context.user.id, actorName: context.user.displayName, action: "comment_created", subjectType: "task", subjectId: id, summary: `comentou na tarefa “${task.title}”.` });
  return Response.json({ comment: { ...comment, authorName: context.user.displayName, canEdit: true, canDelete: true } }, { status: 201 });
}
