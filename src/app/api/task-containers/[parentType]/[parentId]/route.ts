import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { canAccessTask } from "../../../../../db/authorization";
import { ensurePersonalContext } from "../../../../../db/current-user";
import { hierarchyAttachments, taskAssignees, tasks, users } from "../../../../../db/schema";
import { taskParents, type TaskParentType } from "../../../../../db/task-types";
import { createTask, resolveTaskParent } from "../../../tasks/shared";
import { dependencyDisplayForTasks, refreshDependencyReleases } from "../../../../../db/dependency-release";

export async function GET(_: Request, { params }: { params: Promise<{ parentType: string; parentId: string }> }) {
  const context = await ensurePersonalContext(); if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  await refreshDependencyReleases(context);
  const { parentType, parentId } = await params;
  if (!taskParents.includes(parentType as TaskParentType)) return Response.json({ error: "Contêiner inválido." }, { status: 400 });
  const target = await resolveTaskParent(context, parentType as TaskParentType, parentId, "view");
  if (!target.allowed) return Response.json({ error: "Você não tem acesso a este contêiner." }, { status: 403 });
  // A recurring task represents one materialized occurrence. Keep the first
  // pending occurrence of each series in a container and leave the history in
  // the database for reports, audit and the recurrence editor. The correlated
  // subquery makes this reduction before rows are transferred to the Worker.
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
  const attachedTaskIds = context.db.select({ childId: hierarchyAttachments.childId })
    .from(hierarchyAttachments)
    .where(and(eq(hierarchyAttachments.childType, "task"), eq(hierarchyAttachments.parentType, parentType as TaskParentType), eq(hierarchyAttachments.parentId, parentId)));
  const scope = target.organizationId === null ? isNull(tasks.organizationId) : eq(tasks.organizationId, target.organizationId);
  const rows = await context.db.select().from(tasks).where(and(scope, isNull(tasks.parentTaskId), isNull(tasks.deletedAt), inArray(tasks.id, attachedTaskIds), recurrenceVisibility)).orderBy(asc(tasks.createdAt));
  const visible = await Promise.all(rows.map(async (task) => await canAccessTask(context.db, context.user.id, task.id, context.space.id, "view") ? task : null));
  const visibleTasks = visible.filter((item): item is typeof rows[number] => item !== null);
  const taskIds = visibleTasks.map((task) => task.id);
  const assignmentRows = taskIds.length ? await context.db.select({ taskId: taskAssignees.taskId, userId: users.id, displayName: users.displayName }).from(taskAssignees).innerJoin(users, eq(taskAssignees.userId, users.id)).where(inArray(taskAssignees.taskId, taskIds)) : [];
  const assigneesByTask = new Map<string, { userId: string; displayName: string }[]>();
  for (const assignment of assignmentRows) assigneesByTask.set(assignment.taskId, [...(assigneesByTask.get(assignment.taskId) ?? []), { userId: assignment.userId, displayName: assignment.displayName }]);
  const dependencyStates = await dependencyDisplayForTasks(context, taskIds);
  return Response.json({ tasks: visibleTasks.map((task) => { const assignees = assigneesByTask.get(task.id) ?? []; const dependency = dependencyStates.get(task.id) ?? { state: "independent" as const, blockers: [] }; return { ...task, parentName: target.name, tags: [], checklistTotal: 0, checklistCompleted: 0, assignees, dependencyState: dependency.state, dependencyBlockers: dependency.blockers, responsibleAvailability: assignees.length ? "assigned" as const : "unassigned" as const }; }) });
}

export async function POST(request: Request, { params }: { params: Promise<{ parentType: string; parentId: string }> }) {
  const context = await ensurePersonalContext(); if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { parentType, parentId } = await params;
  if (!taskParents.includes(parentType as TaskParentType)) return Response.json({ error: "Contêiner inválido." }, { status: 400 });
  const payload = await request.json();
  const result = await createTask(context, { ...payload, parentType: parentType as TaskParentType, parentId });
  if (result.error) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ task: result.task }, { status: 201 });
}
