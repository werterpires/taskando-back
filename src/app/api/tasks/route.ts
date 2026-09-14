import { and, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { canAccessTask, directlyViewableTask } from "../../../db/authorization";
import { ensurePersonalContext } from "../../../db/current-user";
import { organizationMembers, tags, taskAssignees, taskTags, tasks } from "../../../db/schema";
import { refreshDependencyReleases } from "../../../db/dependency-release";
import { createTask } from "./shared";
import { getEffectiveCyclicQueueState } from "../../../db/cyclic";
import { hydrateTaskRows } from "../../../db/task-view";
import { selectInBatches } from "../../../db/batched-query";

export async function GET() {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  await refreshDependencyReleases(context);
  const cyclicState = await getEffectiveCyclicQueueState(context.db, context.space.id);
  // Keep one useful row per recurring series in "Minhas tarefas". Older
  // materialized occurrences remain available through their history, while
  // the list query discards them before authorization and hydration work.
  const recurrenceVisibility = sql`(
    NOT EXISTS (
      SELECT 1 FROM recurrence_occurrences current_occurrence
      WHERE current_occurrence.task_id = ${tasks.id}
    )
    OR (
      ${tasks.status} NOT IN ('completed', 'cancelled', 'archived')
      AND NOT EXISTS (
        SELECT 1
        FROM recurrence_occurrences current_occurrence
        INNER JOIN recurrence_occurrences previous_occurrence
          ON previous_occurrence.series_id = current_occurrence.series_id
        INNER JOIN tasks previous_task
          ON previous_task.id = previous_occurrence.task_id
        WHERE current_occurrence.task_id = ${tasks.id}
          AND previous_occurrence.scheduled_at < current_occurrence.scheduled_at
          AND previous_task.status NOT IN ('completed', 'cancelled', 'archived')
          AND previous_task.deleted_at IS NULL
      )
    )
  )`;
  const cyclicVisibility = or(ne(tasks.taskType, "cyclic"), eq(tasks.relevance, cyclicState.releasedLevel));
  // Keep ineligible work out of the result set. The UI still receives all
  // eligible statuses so its Open/Completed/All tabs remain instant, but
  // blocked task and phase dependencies never cross the database boundary.
  const dependencyVisibility = sql`(
    NOT EXISTS (
      SELECT 1
      FROM dependency_edges blocked_task_edge
      INNER JOIN tasks predecessor_task
        ON predecessor_task.id = blocked_task_edge.predecessor_id
      WHERE blocked_task_edge.predecessor_type = 'task'
        AND blocked_task_edge.successor_type = 'task'
        AND blocked_task_edge.successor_id = ${tasks.id}
        AND predecessor_task.deleted_at IS NULL
        AND predecessor_task.status NOT IN ('completed', 'cancelled')
        AND NOT (
          (predecessor_task.task_type = 'date'
            AND predecessor_task.date_at IS NOT NULL
            AND predecessor_task.date_at <= to_char(now() at time zone 'UTC', 'YYYY-MM-DD'))
          OR (predecessor_task.task_type = 'event'
            AND predecessor_task.end_at IS NOT NULL
            AND predecessor_task.end_at::timestamptz <= now())
        )
    )
    AND NOT EXISTS (
      SELECT 1
      FROM hierarchy_attachments task_phase_attachment
      INNER JOIN dependency_edges blocked_phase_edge
        ON blocked_phase_edge.successor_type = 'phase'
        AND blocked_phase_edge.predecessor_type = 'phase'
        AND blocked_phase_edge.successor_id = task_phase_attachment.parent_id
      INNER JOIN phases blocked_predecessor_phase
        ON blocked_predecessor_phase.id = blocked_phase_edge.predecessor_id
      WHERE task_phase_attachment.child_type = 'task'
        AND task_phase_attachment.parent_type = 'phase'
        AND task_phase_attachment.child_id = ${tasks.id}
        AND blocked_predecessor_phase.status NOT IN ('completed', 'cancelled')
    )
  )`;
  const candidates = await context.db.select().from(tasks).where(and(isNull(tasks.parentTaskId), isNull(tasks.deletedAt), recurrenceVisibility, cyclicVisibility, dependencyVisibility)).orderBy(desc(tasks.createdAt));
  const organizational = candidates.filter((task) => task.organizationId !== null && !directlyViewableTask(task, context.user.id, context.space.id));
  const organizationIds = [...new Set(organizational.map((task) => task.organizationId).filter((id): id is string => id !== null))];
  const [assignments, memberships] = await Promise.all([
    selectInBatches(organizational.map((task) => task.id), (ids) => context.db.select({ taskId: taskAssignees.taskId }).from(taskAssignees).where(and(inArray(taskAssignees.taskId, ids), eq(taskAssignees.userId, context.user.id)))),
    selectInBatches(organizationIds, (ids) => context.db.select({ organizationId: organizationMembers.organizationId }).from(organizationMembers).where(and(inArray(organizationMembers.organizationId, ids), eq(organizationMembers.userId, context.user.id), eq(organizationMembers.status, "active")))),
  ]);
  const assignedTaskIds = new Set(assignments.map((row) => row.taskId));
  const memberOrganizationIds = new Set(memberships.map((row) => row.organizationId));
  const visible = await Promise.all(candidates.map(async (task) =>
    directlyViewableTask(task, context.user.id, context.space.id, assignedTaskIds, memberOrganizationIds) ||
    await canAccessTask(context.db, context.user.id, task.id, context.space.id, "view") ? task : null));
  const rows = visible.filter((task): task is typeof candidates[number] => task !== null);
  return Response.json({ tasks: await hydrateTaskRows(context, rows, cyclicState) });
}

export async function POST(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const payload = await request.json() as { title?: string; description?: string; dueDate?: string | null; dateAt?: string | null; taskType?: string; approvalRequired?: boolean; tags?: string[]; size?: "xs" | "s" | "m" | "l" | "xl" | null; importance?: "low" | "medium" | "high" | null; urgency?: "low" | "medium" | "high" | null; relevance?: number | null; parentType?: "department" | "team" | null; parentId?: string | null; startAt?: string | null; endAt?: string | null; durationMinutes?: number | null; recurrenceDefinition?: unknown };
  if (payload.tags !== undefined && !Array.isArray(payload.tags)) return Response.json({ error: "Tags inválidas." }, { status: 400 });
  const tagNames = [...new Set((payload.tags ?? []).map((tag) => String(tag).trim().replace(/\s+/g, " ")).filter((id): id is string => typeof id === "string"))];
  if (tagNames.some((tag) => tag.length > 40) || tagNames.length > 12) return Response.json({ error: "Use até 12 tags de no máximo 40 caracteres." }, { status: 400 });
  const parentType = payload.parentType ?? null; const parentId = payload.parentId ?? null;
  if (parentType !== null && parentType !== "department" && parentType !== "team") return Response.json({ error: "Local de tarefa inválido." }, { status: 400 });
  const result = await createTask(context, { ...payload, parentType, parentId });
  if (result.error || !result.task) return Response.json({ error: result.error ?? "Não foi possível criar a tarefa." }, { status: 400 });
  const task = result.task;
  const assignedTags: { id: string; name: string }[] = [];
  for (const name of tagNames) {
    await context.db.insert(tags).values({ id: crypto.randomUUID(), personalSpaceId: context.space.id, name }).onConflictDoNothing();
    const [tag] = await context.db.select().from(tags).where(and(eq(tags.personalSpaceId, context.space.id), eq(tags.name, name))).limit(1);
    if (tag) { await context.db.insert(taskTags).values({ taskId: task.id, tagId: tag.id }).onConflictDoNothing(); assignedTags.push({ id: tag.id, name: tag.name }); }
  }
  return Response.json({ task: { ...task, tags: assignedTags, checklistTotal: 0, checklistCompleted: 0 }, ...(result.series ? { series: result.series } : {}) }, { status: 201 });
}
