import { and, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { recordAuditEvent } from "../../../db/audit";
import { canAccessTask } from "../../../db/authorization";
import { ensurePersonalContext } from "../../../db/current-user";
import { parentNamesByChild } from "../../../db/parent-labels";
import { checklistItems, departments, hierarchyAttachments, recurrenceOccurrences, recurrenceSeries, tags, taskAssignees, taskTags, tasks, teams, users } from "../../../db/schema";
import { commitmentTimeError, dateMarkerError, eventTimeError, taskTypeError } from "../../../db/task-types";
import { taskApprovalRequired } from "../../../db/approval";
import { dependencyDisplayForTasks, refreshDependencyReleases } from "../../../db/dependency-release";
import { createTask } from "./shared";
import { getEffectiveCyclicQueueState } from "../../../db/cyclic";
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
  const visible = await Promise.all(candidates.map(async (task) => await canAccessTask(context.db, context.user.id, task.id, context.space.id, "view") ? task : null));
  const rows = visible.filter((task): task is typeof candidates[number] => task !== null);
  const attachments = await context.db.select().from(hierarchyAttachments);
  const parentNames = await parentNamesByChild(context.db, attachments);
  const taskIds = rows.map((task) => task.id);
  const recurrenceRows = await selectInBatches(taskIds, (ids) => context.db.select({ taskId: recurrenceOccurrences.taskId, occurrenceId: recurrenceOccurrences.id, seriesId: recurrenceOccurrences.seriesId, seriesActive: recurrenceSeries.active, definitionJson: recurrenceSeries.definitionJson }).from(recurrenceOccurrences).innerJoin(recurrenceSeries, eq(recurrenceOccurrences.seriesId, recurrenceSeries.id)).where(inArray(recurrenceOccurrences.taskId, ids)));
  const recurrenceByTask = new Map(recurrenceRows.map((item) => [item.taskId, item]));
  const dependencyStates = await dependencyDisplayForTasks(context, taskIds);
  const assignmentRows = await selectInBatches(taskIds, (ids) => context.db.select({ taskId: taskAssignees.taskId, userId: users.id, displayName: users.displayName }).from(taskAssignees).innerJoin(users, eq(taskAssignees.userId, users.id)).where(inArray(taskAssignees.taskId, ids)));
  const assigneesByTask = new Map<string, { userId: string; displayName: string }[]>();
  for (const assignment of assignmentRows) assigneesByTask.set(assignment.taskId, [...(assigneesByTask.get(assignment.taskId) ?? []), { userId: assignment.userId, displayName: assignment.displayName }]);
  const ownerIds = [...new Set(rows.map((task) => task.ownerUserId).filter((id): id is string => typeof id === "string"))];
  const ownerRows = await selectInBatches(ownerIds, (ids) => context.db.select({ id: users.id, displayName: users.displayName }).from(users).where(inArray(users.id, ids)));
  const ownerNames = new Map(ownerRows.map((user) => [user.id, user.displayName]));
  const taggedRows = await context.db
    .select({ taskId: taskTags.taskId, id: tags.id, name: tags.name })
    .from(taskTags)
    .innerJoin(tags, eq(taskTags.tagId, tags.id))
    .where(eq(tags.personalSpaceId, context.space.id));
  const tagsByTask = new Map<string, { id: string; name: string }[]>();
  for (const tag of taggedRows) tagsByTask.set(tag.taskId, [...(tagsByTask.get(tag.taskId) ?? []), { id: tag.id, name: tag.name }]);
  const checklistRows = await context.db
    .select({ taskId: checklistItems.taskId, completed: checklistItems.completed })
    .from(checklistItems)
    .innerJoin(tasks, eq(checklistItems.taskId, tasks.id))
    .where(eq(tasks.personalSpaceId, context.space.id));
  const checklistByTask = new Map<string, { total: number; completed: number }>();
  for (const item of checklistRows) {
    const current = checklistByTask.get(item.taskId) ?? { total: 0, completed: 0 };
    checklistByTask.set(item.taskId, { total: current.total + 1, completed: current.completed + (item.completed ? 1 : 0) });
  }
  return Response.json({ tasks: rows.map((task) => { const attachment = attachments.find((item) => item.childType === "task" && item.childId === task.id); const assignees = assigneesByTask.get(task.id) ?? []; const dependency = dependencyStates.get(task.id) ?? { state: "independent" as const, blockers: [] }; const recurrence = recurrenceByTask.get(task.id); let recurrenceTimeZone: string | null = null; if (recurrence) { try { recurrenceTimeZone = (JSON.parse(recurrence.definitionJson) as { timeZone?: string }).timeZone ?? null; } catch { recurrenceTimeZone = null; } } return { ...task, parentType: attachment?.parentType ?? null, parentId: attachment?.parentId ?? null, parentName: parentNames.get(`task:${task.id}`) ?? null, ownerName: ownerNames.get(task.ownerUserId ?? "") ?? null, assignees, dependencyState: dependency.state, dependencyBlockers: dependency.blockers, responsibleAvailability: assignees.length ? "assigned" as const : "unassigned" as const, cyclicReleasedLevel: cyclicState.releasedLevel, cyclicReleased: task.taskType === "cyclic" ? (task.relevance ?? 3) === cyclicState.releasedLevel : undefined, recurrenceOccurrenceId: recurrence?.occurrenceId ?? null, recurrenceSeriesId: recurrence?.seriesId ?? null, recurrenceSeriesActive: recurrence?.seriesActive ?? null, recurrenceTimeZone, tags: tagsByTask.get(task.id) ?? [], checklistTotal: checklistByTask.get(task.id)?.total ?? 0, checklistCompleted: checklistByTask.get(task.id)?.completed ?? 0 }; }) });
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
