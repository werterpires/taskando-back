import { ensurePersonalContext } from "../../../../db/current-user";
import { createNotification } from "../../../../db/notifications";
import { claimDueReminders } from "../../../../db/reminders";

export async function GET() {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const due = await claimDueReminders(context.db, context.space.id);
  for (const reminder of due) await createNotification(context.db, { recipientUserId: reminder.ownerUserId, reminderId: reminder.id, type: "reminder", eventKey: `reminder:${reminder.id}:${reminder.remindAt}`, summary: `Lembrete: ${reminder.title}.` });
  return Response.json({ reminders: due });
}
