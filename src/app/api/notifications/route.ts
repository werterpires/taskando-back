import { and, desc, eq, isNull } from "drizzle-orm";
import { canAccessTask } from "../../../db/authorization";
import { ensurePersonalContext } from "../../../db/current-user";
import { notifications, reminders, tasks } from "../../../db/schema";
import { refreshDependencyReleases } from "../../../db/dependency-release";

export async function GET(request?: Request) {
  const context = await ensurePersonalContext(); if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  await refreshDependencyReleases(context);
  const unreadOnly = request ? new URL(request.url).searchParams.get("unreadOnly") === "1" : false;
  const rows = await context.db.select().from(notifications).where(and(eq(notifications.recipientUserId, context.user.id), unreadOnly ? isNull(notifications.readAt) : undefined)).orderBy(desc(notifications.createdAt)).limit(60);
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
  let payload: unknown;
  try { payload = await request.json(); } catch { return Response.json({ error: "Notificação inválida." }, { status: 400 }); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return Response.json({ error: "Notificação inválida." }, { status: 400 });
  const input = payload as Record<string, unknown>;
  if (input.all === true && input.read === true && Object.keys(input).every((key) => key === "all" || key === "read")) {
    await context.db.update(notifications).set({ readAt: new Date().toISOString() }).where(and(eq(notifications.recipientUserId, context.user.id), isNull(notifications.readAt)));
    return Response.json({ ok: true });
  }
  const { id, read } = input;
  if (typeof id !== "string" || !id || typeof read !== "boolean" || Object.keys(input).some((key) => key !== "id" && key !== "read")) return Response.json({ error: "Notificação inválida." }, { status: 400 });
  const [item] = await context.db.select().from(notifications).where(and(eq(notifications.id, id), eq(notifications.recipientUserId, context.user.id))).limit(1);
  if (!item) return Response.json({ error: "Notificação não encontrada." }, { status: 404 });
  const taskAllowed = item.taskId ? await canAccessTask(context.db, context.user.id, item.taskId, context.space.id, "view") : false;
  const [reminder] = item.reminderId ? await context.db.select({ id: reminders.id }).from(reminders).where(and(eq(reminders.id, item.reminderId), eq(reminders.ownerUserId, context.user.id))).limit(1) : [];
  if (!taskAllowed && !reminder) return Response.json({ error: "Notificação não encontrada." }, { status: 404 });
  await context.db.update(notifications).set({ readAt: read ? new Date().toISOString() : null }).where(and(eq(notifications.id, id), eq(notifications.recipientUserId, context.user.id)));
  return Response.json({ ok: true });
}
