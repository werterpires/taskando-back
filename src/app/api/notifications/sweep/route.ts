import { eq, and, inArray, isNull } from "drizzle-orm";
import { canAccessTask } from "../../../../db/authorization";
import { ensurePersonalContext } from "../../../../db/current-user";
import { createNotification } from "../../../../db/notifications";
import { notificationPreferences, taskAssignees, tasks } from "../../../../db/schema";
import { dateKeyInTimeZone, defaultTimeZone } from "../../../../db/time-zone";
import { selectInBatches } from "../../../../db/batched-query";

const finalStatuses = ["completed", "cancelled", "archived"] as const;

export async function POST() {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const now = new Date();
  const rows = await context.db.select().from(tasks).where(and(eq(tasks.personalSpaceId, context.space.id), isNull(tasks.parentTaskId), isNull(tasks.deletedAt)));
  const assigneeRows = await selectInBatches(rows.map((task) => task.id), (ids) => context.db.select({ taskId: taskAssignees.taskId, userId: taskAssignees.userId }).from(taskAssignees).where(inArray(taskAssignees.taskId, ids)));
  let considered = 0;
  for (const task of rows) {
    if ((finalStatuses as readonly string[]).includes(task.status) || !await canAccessTask(context.db, context.user.id, task.id, context.space.id, "view")) continue;
    const recipients = [...new Set([task.ownerUserId ?? task.authorUserId, ...assigneeRows.filter((item) => item.taskId === task.id).map((item) => item.userId)])];
    const scheduled = Boolean(task.taskType === "scheduled" && task.startAt && new Date(task.startAt).getTime() >= now.getTime() && new Date(task.startAt).getTime() <= now.getTime() + 15 * 60_000);
    const recipientPreferences = await selectInBatches(recipients, (ids) => context.db.select().from(notificationPreferences).where(inArray(notificationPreferences.userId, ids)));
    const preferencesByRecipient = new Map(recipientPreferences.map((item) => [item.userId, item]));
    let taskAlerted = false;
    for (const recipientUserId of recipients) {
      if (!await canAccessTask(context.db, recipientUserId, task.id, context.space.id, "view")) continue;
      const recipientPreferences = preferencesByRecipient.get(recipientUserId);
      const timeZone = recipientPreferences?.timeZone ?? defaultTimeZone;
      const today = dateKeyInTimeZone(now, timeZone) ?? now.toISOString().slice(0, 10);
      const dueSoonLimit = dateKeyInTimeZone(new Date(now.getTime() + (recipientPreferences?.dueSoonMinutes ?? 1440) * 60_000), timeZone) ?? today;
      const dueSoon = Boolean(task.dueDate && task.dueDate >= today && task.dueDate <= dueSoonLimit);
      const overdue = Boolean(task.dueDate && task.dueDate < today);
      if (dueSoon) await createNotification(context.db, { recipientUserId, taskId: task.id, type: "due_soon", eventKey: `due-soon:${task.id}:${task.dueDate}`, summary: `A tarefa “${task.title}” vence em breve (${task.dueDate}).` });
      if (overdue) await createNotification(context.db, { recipientUserId, taskId: task.id, type: "overdue", eventKey: `overdue:${task.id}:${task.dueDate}`, summary: `A tarefa “${task.title}” está atrasada.` });
      if (scheduled) await createNotification(context.db, { recipientUserId, taskId: task.id, type: "scheduled", eventKey: `scheduled:${task.id}:${task.startAt}`, summary: `A tarefa agendada “${task.title}” começa em breve.` });
      taskAlerted = taskAlerted || dueSoon || overdue || scheduled;
    }
    considered += Number(taskAlerted);
  }
  return Response.json({ considered });
}