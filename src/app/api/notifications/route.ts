import { and, desc, eq } from "drizzle-orm";
import { canAccessTask } from "../../../db/authorization";
import { ensurePersonalContext } from "../../../db/current-user";
import { notifications, reminders, tasks } from "../../../db/schema";
import { refreshDependencyReleases } from "../../../db/dependency-release";

export async function GET() {
  const context = await ensurePersonalContext(); if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  await refreshDependencyReleases(context);
  const rows = await context.db.select().from(notifications).where(eq(notifications.recipientUserId, context.user.id)).orderBy(desc(notifications.createdAt)).limit(60);
  const visible = [] as { id: string; taskId: string | null; reminderId: string | null; type: "assignment" | "comment" | "mention" | "dependency" | "due_soon" | "overdue" | "scheduled" | "reminder"; summary: string; readAt: string | null; createdAt: string }[];
  for (const item of rows) {
    const [task] = item.taskId ? await context.db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, item.taskId)).limit(1) : [];
    const [reminder] = item.reminderId ? await context.db.select({ id: reminders.id }).from(reminders).where(and(eq(reminders.id, item.reminderId), eq(reminders.ownerUserId, context.user.id))).limit(1) : [];
    if ((task && await canAccessTask(context.db, context.user.id, task.id, context.space.id, "view")) || reminder) visible.push({ id: item.id, taskId: item.taskId, reminderId: item.reminderId, type: item.type, summary: item.summary, readAt: item.readAt, createdAt: item.createdAt });
  }
  return Response.json({ notifications: visible, unreadCount: visible.filter((item) => !item.readAt).length });
}

export async function PATCH(request: Request) {
  const context = await ensurePersonalContext(); if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { id, read } = await request.json() as { id?: string; read?: boolean };
  if (!id || typeof read !== "boolean") return Response.json({ error: "Notificação inválida." }, { status: 400 });
  const [item] = await context.db.select().from(notifications).where(and(eq(notifications.id, id), eq(notifications.recipientUserId, context.user.id))).limit(1);
  if (!item) return Response.json({ error: "Notificação não encontrada." }, { status: 404 });
  const taskAllowed = item.taskId ? await canAccessTask(context.db, context.user.id, item.taskId, context.space.id, "view") : false;
  const [reminder] = item.reminderId ? await context.db.select({ id: reminders.id }).from(reminders).where(and(eq(reminders.id, item.reminderId), eq(reminders.ownerUserId, context.user.id))).limit(1) : [];
  if (!taskAllowed && !reminder) return Response.json({ error: "Notificação não encontrada." }, { status: 404 });
  await context.db.update(notifications).set({ readAt: read ? new Date().toISOString() : null }).where(eq(notifications.id, id));
  return Response.json({ ok: true });
}
