import { getDb } from ".";
import { eq } from "drizzle-orm";
import { notificationPreferences, notifications } from "./schema";

type Database = Awaited<ReturnType<typeof getDb>>;
export type NotificationType = "assignment" | "comment" | "mention" | "dependency" | "due_soon" | "overdue" | "scheduled" | "reminder";
export async function createNotification(db: Database, input: { recipientUserId: string; actorUserId?: string | null; taskId?: string | null; reminderId?: string | null; type: NotificationType; eventKey: string; summary: string }) {
  if (input.recipientUserId === input.actorUserId) return;
  const [preference] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, input.recipientUserId)).limit(1);
  if (preference && ({ due_soon: preference.dueSoonEnabled, overdue: preference.overdueEnabled, scheduled: preference.scheduledEnabled, reminder: preference.reminderEnabled } as Partial<Record<NotificationType, boolean>>)[input.type] === false) return;
  await db.insert(notifications).values({ id: crypto.randomUUID(), recipientUserId: input.recipientUserId, actorUserId: input.actorUserId ?? null, taskId: input.taskId ?? null, reminderId: input.reminderId ?? null, type: input.type, eventKey: input.eventKey, summary: input.summary }).onConflictDoNothing();
}
