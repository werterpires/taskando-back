import { getDb } from ".";
import { auditEvents } from "./schema";

type AuditAction = typeof auditEvents.$inferInsert.action;
type AuditSubject = typeof auditEvents.$inferInsert.subjectType;
type Database = Awaited<ReturnType<typeof getDb>>;

export async function recordAuditEvent(db: Database, event: {
  organizationId?: string | null;
  personalSpaceId?: string | null;
  actorUserId: string;
  actorName: string;
  action: NonNullable<AuditAction>;
  subjectType: NonNullable<AuditSubject>;
  subjectId: string;
  summary: string;
}) {
  await db.insert(auditEvents).values({ id: crypto.randomUUID(), ...event });
}
