import { and, eq, inArray } from "drizzle-orm";
import type { ensurePersonalContext } from "./current-user";
import { getCyclicQueueState } from "./cyclic";
import { dependencyDisplayForTasks } from "./dependency-release";
import { parentNamesByChild } from "./parent-labels";
import { checklistItems, hierarchyAttachments, recurrenceOccurrences, recurrenceSeries, tags, taskAssignees, taskTags, tasks, users } from "./schema";

type PersonalContext = NonNullable<Awaited<ReturnType<typeof ensurePersonalContext>>>;
type TaskRow = typeof tasks.$inferSelect;

/** Hidrata somente a página visível para evitar varreduras globais de tags, checklist e hierarquia. */
export async function hydrateTaskRows(context: PersonalContext, rows: TaskRow[]) {
  if (!rows.length) return [];
  const taskIds = rows.map((task) => task.id);
  const ownerIds = [...new Set(rows.map((task) => task.ownerUserId).filter((id): id is string => typeof id === "string"))];
  const [attachments, recurrenceRows, dependencyStates, assignmentRows, ownerRows, taggedRows, checklistRows, cyclicState] = await Promise.all([
    context.db.select().from(hierarchyAttachments).where(and(eq(hierarchyAttachments.childType, "task"), inArray(hierarchyAttachments.childId, taskIds))),
    context.db.select({ taskId: recurrenceOccurrences.taskId, occurrenceId: recurrenceOccurrences.id, seriesId: recurrenceOccurrences.seriesId, seriesActive: recurrenceSeries.active, definitionJson: recurrenceSeries.definitionJson }).from(recurrenceOccurrences).innerJoin(recurrenceSeries, eq(recurrenceOccurrences.seriesId, recurrenceSeries.id)).where(inArray(recurrenceOccurrences.taskId, taskIds)),
    dependencyDisplayForTasks(context, taskIds),
    context.db.select({ taskId: taskAssignees.taskId, userId: users.id, displayName: users.displayName }).from(taskAssignees).innerJoin(users, eq(taskAssignees.userId, users.id)).where(inArray(taskAssignees.taskId, taskIds)),
    ownerIds.length ? context.db.select({ id: users.id, displayName: users.displayName }).from(users).where(inArray(users.id, ownerIds)) : Promise.resolve([]),
    context.db.select({ taskId: taskTags.taskId, id: tags.id, name: tags.name }).from(taskTags).innerJoin(tags, eq(taskTags.tagId, tags.id)).where(inArray(taskTags.taskId, taskIds)),
    context.db.select({ taskId: checklistItems.taskId, completed: checklistItems.completed }).from(checklistItems).where(inArray(checklistItems.taskId, taskIds)),
    getCyclicQueueState(context.db, context.space.id),
  ]);
  const parentNames = await parentNamesByChild(context.db, attachments);
  const recurrenceByTask = new Map(recurrenceRows.map((item) => [item.taskId, item]));
  const assigneesByTask = new Map<string, { userId: string; displayName: string }[]>();
  for (const assignment of assignmentRows) assigneesByTask.set(assignment.taskId, [...(assigneesByTask.get(assignment.taskId) ?? []), { userId: assignment.userId, displayName: assignment.displayName }]);
  const ownerNames = new Map(ownerRows.map((user) => [user.id, user.displayName]));
  const tagsByTask = new Map<string, { id: string; name: string }[]>();
  for (const tag of taggedRows) tagsByTask.set(tag.taskId, [...(tagsByTask.get(tag.taskId) ?? []), { id: tag.id, name: tag.name }]);
  const checklistByTask = new Map<string, { total: number; completed: number }>();
  for (const item of checklistRows) {
    const current = checklistByTask.get(item.taskId) ?? { total: 0, completed: 0 };
    checklistByTask.set(item.taskId, { total: current.total + 1, completed: current.completed + (item.completed ? 1 : 0) });
  }
  return rows.map((task) => {
    const attachment = attachments.find((item) => item.childId === task.id);
    const assignees = assigneesByTask.get(task.id) ?? [];
    const dependency = dependencyStates.get(task.id) ?? { state: "independent" as const, blockers: [] };
    const recurrence = recurrenceByTask.get(task.id);
    let recurrenceTimeZone: string | null = null;
    if (recurrence) { try { recurrenceTimeZone = (JSON.parse(recurrence.definitionJson) as { timeZone?: string }).timeZone ?? null; } catch { recurrenceTimeZone = null; } }
    return { ...task, parentType: attachment?.parentType ?? null, parentId: attachment?.parentId ?? null, parentName: parentNames.get(`task:${task.id}`) ?? null, ownerName: ownerNames.get(task.ownerUserId ?? "") ?? null, assignees, dependencyState: dependency.state, dependencyBlockers: dependency.blockers, responsibleAvailability: assignees.length ? "assigned" as const : "unassigned" as const, cyclicReleasedLevel: cyclicState.releasedLevel, cyclicReleased: task.taskType === "cyclic" ? (task.relevance ?? 3) === cyclicState.releasedLevel : undefined, recurrenceOccurrenceId: recurrence?.occurrenceId ?? null, recurrenceSeriesId: recurrence?.seriesId ?? null, recurrenceSeriesActive: recurrence?.seriesActive ?? null, recurrenceTimeZone, tags: tagsByTask.get(task.id) ?? [], checklistTotal: checklistByTask.get(task.id)?.total ?? 0, checklistCompleted: checklistByTask.get(task.id)?.completed ?? 0 };
  });
}
