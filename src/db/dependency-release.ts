import { and, eq, inArray, isNull } from "drizzle-orm";
import { canAccessTask } from "./authorization";
import { createNotification } from "./notifications";
import { auditEvents, dependencyEdges, hierarchyAttachments, phases, processes, taskAssignees, tasks } from "./schema";
import { statusAfterApprovalConfiguration } from "./approval";
import { isDateMarkerReleased, isEventReleased } from "./task-types";
import { selectInBatches } from "./batched-query";

type Context = NonNullable<Awaited<ReturnType<typeof import("./current-user").ensurePersonalContext>>>;

export function isDependencyReleased(task: typeof tasks.$inferSelect, now = new Date()) {
  if (task.status === "completed" || task.status === "cancelled") return true;
  if (task.taskType === "date") return isDateMarkerReleased(task.dateAt, now);
  if (task.taskType === "event") return isEventReleased(task.endAt, now);
  return false;
}

export type DependencyDisplayState = "independent" | "blocked" | "released";
export type DependencyDisplay = {
  state: DependencyDisplayState;
  blockers: { id: string; title: string }[];
};

/** Deriva o estado de dependência sem misturá-lo ao estado de trabalho da tarefa. */
export async function dependencyDisplayForTasks(context: Context, taskIds: string[], now = new Date()) {
  const result = new Map<string, DependencyDisplay>();
  if (!taskIds.length) return result;
  const [incoming, phaseParents] = await Promise.all([
    selectInBatches(taskIds, (ids) => context.db.select({ successorId: dependencyEdges.successorId, predecessorId: dependencyEdges.predecessorId })
      .from(dependencyEdges)
      .where(and(eq(dependencyEdges.successorType, "task"), eq(dependencyEdges.predecessorType, "task"), inArray(dependencyEdges.successorId, ids)))),
    selectInBatches(taskIds, (ids) => context.db.select({ taskId: hierarchyAttachments.childId, phaseId: hierarchyAttachments.parentId })
      .from(hierarchyAttachments)
      .where(and(eq(hierarchyAttachments.childType, "task"), eq(hierarchyAttachments.parentType, "phase"), inArray(hierarchyAttachments.childId, ids)))),
  ]);
  const predecessorIds = [...new Set(incoming.map((edge) => edge.predecessorId))];
  const predecessorRows = predecessorIds.length ? await context.db.select({ id: tasks.id, title: tasks.title, status: tasks.status, taskType: tasks.taskType, dateAt: tasks.dateAt, endAt: tasks.endAt }).from(tasks).where(and(inArray(tasks.id, predecessorIds), isNull(tasks.deletedAt))) : [];
  const predecessorsById = new Map(predecessorRows.map((task) => [task.id, task]));
  const phaseByTask = new Map(phaseParents.filter((row): row is { taskId: string; phaseId: string } => Boolean(row.phaseId)).map((row) => [row.taskId, row.phaseId]));
  const phaseIds = [...new Set(phaseByTask.values())];
  const incomingPhases = phaseIds.length ? await selectInBatches(phaseIds, (ids) => context.db.select({ successorId: dependencyEdges.successorId, predecessorId: dependencyEdges.predecessorId })
    .from(dependencyEdges)
    .where(and(eq(dependencyEdges.successorType, "phase"), eq(dependencyEdges.predecessorType, "phase"), inArray(dependencyEdges.successorId, ids)))) : [];
  const predecessorPhaseIds = [...new Set(incomingPhases.map((edge) => edge.predecessorId))];
  const predecessorPhases = await selectInBatches(predecessorPhaseIds, (ids) => context.db.select({ id: phases.id, title: phases.title, status: phases.status }).from(phases).where(inArray(phases.id, ids)));
  const predecessorPhasesById = new Map(predecessorPhases.map((phase) => [phase!.id, phase]));
  for (const taskId of taskIds) {
    const predecessorEdges = incoming.filter((edge) => edge.successorId === taskId);
    const taskBlockers = predecessorEdges.map((edge) => predecessorsById.get(edge.predecessorId)).filter((task): task is typeof predecessorRows[number] => Boolean(task) && !isDependencyReleased(task as typeof tasks.$inferSelect, now)).map((task) => ({ id: task.id, title: task.title }));
    const phaseId = phaseByTask.get(taskId);
    const phaseEdges = phaseId ? incomingPhases.filter((edge) => edge.successorId === phaseId) : [];
    const phaseBlockers = phaseEdges
      .map((edge) => predecessorPhasesById.get(edge.predecessorId))
      .filter((phase): phase is NonNullable<typeof phase> => Boolean(phase) && !["completed", "cancelled"].includes(phase!.status))
      .map((phase) => ({ id: phase.id, title: phase.title }));
    const blockers = [...taskBlockers, ...phaseBlockers];
    result.set(taskId, { state: blockers.length ? "blocked" : predecessorEdges.length || phaseEdges.length ? "released" : "independent", blockers });
  }
  return result;
}

export async function dependencyBlockers(context: Context, taskId: string) {
  const incoming = await context.db.select({ predecessorId: dependencyEdges.predecessorId }).from(dependencyEdges).where(and(eq(dependencyEdges.successorType, "task"), eq(dependencyEdges.successorId, taskId), eq(dependencyEdges.predecessorType, "task")));
  if (!incoming.length) return [] as typeof tasks.$inferSelect[];
  const predecessors = await context.db.select().from(tasks).where(and(inArray(tasks.id, incoming.map((edge) => edge.predecessorId)), isNull(tasks.deletedAt)));
  return predecessors.filter((task) => !isDependencyReleased(task));
}

export async function dependencySuccessors(context: Context, taskId: string) {
  const edges = await context.db.select({ predecessorId: dependencyEdges.predecessorId, successorId: dependencyEdges.successorId })
    .from(dependencyEdges)
    .where(and(eq(dependencyEdges.predecessorType, "task"), eq(dependencyEdges.successorType, "task")));
  const pending = [taskId];
  const visited = new Set<string>();
  while (pending.length) {
    const current = pending.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const edge of edges) if (edge.predecessorId === current && !visited.has(edge.successorId)) pending.push(edge.successorId);
  }
  const ids = [...visited].filter((id) => id !== taskId);
  return ids.length ? await context.db.select().from(tasks).where(and(inArray(tasks.id, ids), isNull(tasks.deletedAt))) : [] as typeof tasks.$inferSelect[];
}

/** Retorna todas as Fases alcançáveis a jusante, preservando a prévia da cascata. */
export async function phaseDependencySuccessors(context: Context, phaseId: string) {
  const edges = await context.db.select({ predecessorId: dependencyEdges.predecessorId, successorId: dependencyEdges.successorId })
    .from(dependencyEdges)
    .where(and(eq(dependencyEdges.predecessorType, "phase"), eq(dependencyEdges.successorType, "phase")));
  const pending = [phaseId];
  const visited = new Set<string>();
  while (pending.length) {
    const current = pending.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const edge of edges) if (edge.predecessorId === current && !visited.has(edge.successorId)) pending.push(edge.successorId);
  }
  const ids = [...visited].filter((id) => id !== phaseId);
  return ids.length ? await context.db.select().from(phases).where(inArray(phases.id, ids)) : [] as typeof phases.$inferSelect[];
}

export async function refreshPhaseCompletionForTask(context: Context, taskId: string) {
  const parents = await context.db.select({ phaseId: hierarchyAttachments.parentId }).from(hierarchyAttachments).where(and(eq(hierarchyAttachments.childType, "task"), eq(hierarchyAttachments.childId, taskId), eq(hierarchyAttachments.parentType, "phase")));
  for (const parent of parents) {
    if (!parent.phaseId) continue;
    const children = await context.db.select({ childId: hierarchyAttachments.childId }).from(hierarchyAttachments).where(and(eq(hierarchyAttachments.parentType, "phase"), eq(hierarchyAttachments.parentId, parent.phaseId), eq(hierarchyAttachments.childType, "task")));
    const rows = children.length ? await context.db.select().from(tasks).where(and(inArray(tasks.id, children.map((child) => child.childId)), isNull(tasks.deletedAt))) : [];
    if (!rows.length || rows.some((task) => !["completed", "cancelled", "archived"].includes(task.status))) continue;
    const [phase] = await context.db.select().from(phases).where(eq(phases.id, parent.phaseId)).limit(1);
    if (!phase || ["completed", "cancelled", "archived"].includes(phase.status)) continue;
    const nextStatus = statusAfterApprovalConfiguration("completed", phase.approvalRequired);
    await context.db.update(phases).set({ status: nextStatus, updatedAt: new Date().toISOString() }).where(eq(phases.id, phase!.id));
    await context.db.insert(auditEvents).values({ id: crypto.randomUUID(), personalSpaceId: phase.organizationId ? null : context.space.id, organizationId: phase.organizationId, actorUserId: context.user.id, actorName: context.user.displayName, action: "phase_edited", subjectType: "phase", subjectId: phase!.id, summary: `atualizou automaticamente a Fase “${phase.title}” para ${nextStatus === "awaiting_approval" ? "Aguardando aprovação" : "Concluído"} após finalizar suas tarefas.` });
  }
}

export async function refreshProcessCompletionForItem(context: Context, itemId: string) {
  const parents = await context.db.select({ processId: hierarchyAttachments.parentId }).from(hierarchyAttachments).where(and(eq(hierarchyAttachments.childId, itemId), eq(hierarchyAttachments.parentType, "process")));
  for (const parent of parents) {
    if (!parent.processId) continue;
    const children = await context.db.select({ childType: hierarchyAttachments.childType, childId: hierarchyAttachments.childId }).from(hierarchyAttachments).where(and(eq(hierarchyAttachments.parentType, "process"), eq(hierarchyAttachments.parentId, parent.processId)));
    const phaseRows = children.filter((child) => child.childType === "phase").length ? await context.db.select().from(phases).where(inArray(phases.id, children.filter((child) => child.childType === "phase").map((child) => child.childId))) : [];
    const taskRows = children.filter((child) => child.childType === "task").length ? await context.db.select().from(tasks).where(and(inArray(tasks.id, children.filter((child) => child.childType === "task").map((child) => child.childId)), isNull(tasks.deletedAt))) : [];
    const all = [...phaseRows, ...taskRows];
    if (!all.length || all.some((item) => !["completed", "cancelled", "archived"].includes(item.status))) continue;
    const [process] = await context.db.select().from(processes).where(eq(processes.id, parent.processId)).limit(1);
    if (!process || ["completed", "cancelled", "archived"].includes(process.status)) continue;
    const nextStatus = statusAfterApprovalConfiguration("completed", process.approvalRequired);
    await context.db.update(processes).set({ status: nextStatus, updatedAt: new Date().toISOString() }).where(eq(processes.id, process.id));
    await context.db.insert(auditEvents).values({ id: crypto.randomUUID(), personalSpaceId: process.organizationId ? null : context.space.id, organizationId: process.organizationId, actorUserId: context.user.id, actorName: context.user.displayName, action: "process_edited", subjectType: "process", subjectId: process.id, summary: `atualizou automaticamente o Processo “${process.title}” para ${nextStatus === "awaiting_approval" ? "Aguardando aprovação" : "Concluído"} após finalizar seus filhos.` });
  }
}

export async function refreshDependencyReleases(context: Context, successorIds?: string[]) {
  const edges = await context.db.select({ predecessorId: dependencyEdges.predecessorId, successorId: dependencyEdges.successorId }).from(dependencyEdges).where(and(eq(dependencyEdges.predecessorType, "task"), eq(dependencyEdges.successorType, "task")));
  const ids = successorIds?.length ? successorIds : [...new Set(edges.map((edge) => edge.successorId))];
  if (!ids.length) return;
  const rows = await selectInBatches(ids, (batch) => context.db.select().from(tasks).where(and(inArray(tasks.id, batch), isNull(tasks.deletedAt))));
  const predecessorsBySuccessor = new Map<string, string[]>();
  for (const edge of edges) predecessorsBySuccessor.set(edge.successorId, [...(predecessorsBySuccessor.get(edge.successorId) ?? []), edge.predecessorId]);
  const allPredecessorIds = [...new Set(edges.flatMap((edge) => edge.predecessorId))];
  const predecessorRows = await selectInBatches(allPredecessorIds, (batch) => context.db.select().from(tasks).where(and(inArray(tasks.id, batch), isNull(tasks.deletedAt))));
  const byId = new Map(predecessorRows.map((task) => [task.id, task]));
  for (const successor of rows) {
    if (["completed", "cancelled", "archived"].includes(successor.status)) continue;
    const predecessorIds = predecessorsBySuccessor.get(successor.id) ?? [];
    if (!predecessorIds.length || !predecessorIds.every((id) => { const task = byId.get(id); return task ? isDependencyReleased(task) : true; })) continue;
    const assignees = await context.db.select({ userId: taskAssignees.userId }).from(taskAssignees).where(eq(taskAssignees.taskId, successor.id));
    const recipients = [...new Set([successor.ownerUserId, ...assignees.map((row) => row.userId)].filter((id): id is string => Boolean(id)))];
    for (const recipientUserId of recipients) {
      if (!await canAccessTask(context.db, recipientUserId, successor.id, context.space.id, "view")) continue;
      await createNotification(context.db, { recipientUserId, taskId: successor.id, type: "dependency", eventKey: `dependency-released:${successor.id}`, summary: `A tarefa “${successor.title}” foi liberada.` });
    }
  }
}
