import { recordAuditEvent } from "./audit";
import { workStateLabel, type WorkState } from "./task-state";

type Database = Parameters<typeof recordAuditEvent>[0];
type SubjectType = "task" | "project" | "front" | "product" | "process" | "phase";

export async function recordApprovalRequested(db: Database, input: {
  organizationId?: string | null;
  personalSpaceId?: string | null;
  actorUserId: string;
  actorName: string;
  subjectType: SubjectType;
  subjectId: string;
  title: string;
  previousStatus: WorkState;
}) {
  await recordAuditEvent(db, {
    organizationId: input.organizationId ?? undefined,
    personalSpaceId: input.personalSpaceId ?? undefined,
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    action: "approval_requested",
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    summary: `${input.actorName} solicitou aprovação de ${input.subjectType} “${input.title}” após ${workStateLabel[input.previousStatus]}.`,
  });
}

export async function recordApprovalDecision(db: Database, input: {
  organizationId?: string | null;
  personalSpaceId?: string | null;
  actorUserId: string;
  actorName: string;
  subjectType: SubjectType;
  subjectId: string;
  title: string;
  decision: "approved" | "rejected";
  reason?: string | null;
}) {
  const rejected = input.decision === "rejected";
  await recordAuditEvent(db, {
    organizationId: input.organizationId ?? undefined,
    personalSpaceId: input.personalSpaceId ?? undefined,
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    action: rejected ? "approval_rejected" : "approval_approved",
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    summary: rejected
      ? `${input.actorName} rejeitou ${input.subjectType} “${input.title}” e devolveu para Em execução${input.reason ? `: ${input.reason}` : "."}`
      : `${input.actorName} aprovou ${input.subjectType} “${input.title}”.`,
  });
}
