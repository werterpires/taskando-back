import { and, eq, isNull, lte } from "drizzle-orm";
import { reminders } from "./schema";
import { defaultTimeZone, isValidTimeZone } from "./time-zone";

export const reminderDefaultTimeZone = defaultTimeZone;

type Database = NonNullable<Awaited<ReturnType<typeof import("./current-user").ensurePersonalContext>>>["db"];

export function validateReminderDate(value: unknown) {
  if (typeof value !== "string" || !value || Number.isNaN(new Date(value).getTime())) return "Informe uma data e hora válidas para o lembrete.";
  return null;
}

export function normalizeReminderTitle(value: unknown) {
  const title = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (!title || title.length > 160) return { error: "Informe um título de até 160 caracteres." };
  return { value: title };
}

export function normalizeReminderTimeZone(value: unknown) {
  const timeZone = typeof value === "string" && value.trim() ? value.trim() : reminderDefaultTimeZone;
  return isValidTimeZone(timeZone) ? { value: timeZone } : { error: "Informe um fuso horário IANA válido para o lembrete." };
}

export async function claimDueReminders(db: Database, personalSpaceId: string, now = new Date()) {
  const due = await db.select().from(reminders).where(and(eq(reminders.personalSpaceId, personalSpaceId), isNull(reminders.firedAt), lte(reminders.remindAt, now.toISOString())));
  const claimed = [] as typeof due;
  const firedAt = now.toISOString();
  for (const reminder of due) {
    const [row] = await db.update(reminders).set({ firedAt, updatedAt: firedAt }).where(and(eq(reminders.id, reminder.id), isNull(reminders.firedAt))).returning();
    if (row) claimed.push(row);
  }
  return claimed;
}
