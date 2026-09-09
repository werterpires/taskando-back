import { and, eq, inArray, isNull } from "drizzle-orm";
import { recordAuditEvent } from "../../../../db/audit";
import { ensurePersonalContext } from "../../../../db/current-user";
import { auditEvents, checklistItems, recurrenceOccurrences, tags, taskTags, tasks } from "../../../../db/schema";
import { canTransitionWorkState, workStateLabel, workStates, type WorkState } from "../../../../db/task-state";
import { canAccessTask } from "../../../../db/authorization";
import { statusAfterApprovalConfiguration, taskApprovalRequired } from "../../../../db/approval";
import { recordApprovalRequested } from "../../../../db/approval-audit";
import { commitmentTimeError, dateMarkerError, eventTimeError } from "../../../../db/task-types";
import { dependencyBlockers, dependencySuccessors, refreshDependencyReleases, refreshPhaseCompletionForTask, refreshProcessCompletionForItem } from "../../../../db/dependency-release";
import { completeCyclicTask, getEffectiveCyclicQueueState, normalizeCyclicRelevance } from "../../../../db/cyclic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  const payload = (await request.json()) as { status?: WorkState; reason?: string; subtaskResolution?: "complete" | "cancel"; cancelDecision?: "release" | "cascade"; title?: string; description?: string; dueDate?: string | null; dateAt?: string | null; startAt?: string | null; endAt?: string | null; durationMinutes?: number | null; pinnedForToday?: boolean; tags?: string[]; approvalRequired?: boolean; approve?: boolean; size?: "xs" | "s" | "m" | "l" | "xl" | null; importance?: "low" | "medium" | "high" | null; urgency?: "low" | "medium" | "high" | null; relevance?: number | null };
  const editRequested = payload.title !== undefined || payload.description !== undefined || payload.dueDate !== undefined || payload.dateAt !== undefined || payload.startAt !== undefined || payload.endAt !== undefined || payload.durationMinutes !== undefined || payload.pinnedForToday !== undefined || payload.tags !== undefined || payload.approvalRequired !== undefined || payload.size !== undefined || payload.importance !== undefined || payload.urgency !== undefined || payload.relevance !== undefined;
  const capability = payload.approve ? "approve" : editRequested ? "edit" : payload.status !== undefined ? "interact" : "edit";
  if (!(await canAccessTask(context.db, context.user.id, id, context.space.id, capability))) return Response.json({ error: "Tarefa não encontrada." }, { status: 404 });
  const update: Partial<typeof tasks.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (payload.title !== undefined) {
    const title = payload.title.trim();
    if (!title) return Response.json({ error: "Informe o título da tarefa." }, { status: 400 });
    update.title = title;
  }
  if (payload.description !== undefined) update.description = payload.description.trim();
  if (payload.dueDate !== undefined) {
    const dueDate = payload.dueDate?.trim() || null;
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return Response.json({ error: "Use uma data válida." }, { status: 400 });
    update.dueDate = dueDate;
  }
  if (payload.pinnedForToday !== undefined) {
    if (typeof payload.pinnedForToday !== "boolean") return Response.json({ error: "Valor de prioridade inválido." }, { status: 400 });
    update.pinnedForToday = payload.pinnedForToday;
  }
  if (payload.size !== undefined) {
    if (payload.size !== null && !["xs", "s", "m", "l", "xl"].includes(payload.size)) return Response.json({ error: "Tamanho de tarefa inválido." }, { status: 400 });
    update.size = payload.size;
  }
  if (payload.importance !== undefined) {
    if (payload.importance !== null && !["low", "medium", "high"].includes(payload.importance)) return Response.json({ error: "Importância de tarefa inválida." }, { status: 400 });
    update.importance = payload.importance;
  }
  if (payload.urgency !== undefined) {
    if (payload.urgency !== null && !["low", "medium", "high"].includes(payload.urgency)) return Response.json({ error: "Urgência de tarefa inválida." }, { status: 400 });
    update.urgency = payload.urgency;
  }
  let tagNames: string[] | undefined;
  if (payload.tags !== undefined) {
    if (!Array.isArray(payload.tags)) return Response.json({ error: "Tags inválidas." }, { status: 400 });
    tagNames = [...new Set(payload.tags.map((tag) => tag.trim().replace(/\s+/g, " ")).filter(Boolean))];
    if (tagNames.some((tag) => tag.length > 40) || tagNames.length > 12) return Response.json({ error: "Use até 12 tags de no máximo 40 caracteres." }, { status: 400 });
  }
  const [before] = await context.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!before) return Response.json({ error: "Tarefa não encontrada." }, { status: 404 });
  if (payload.relevance !== undefined) {
    const cyclicRelevance = normalizeCyclicRelevance(before.taskType, payload.relevance);
    if (cyclicRelevance.error) return Response.json({ error: cyclicRelevance.error }, { status: 400 });
    update.relevance = cyclicRelevance.value;
  }
  if (before.taskType === "cyclic" && (payload.status === "in_progress" || payload.status === "completed" || payload.approve)) {
    const queueState = await getEffectiveCyclicQueueState(context.db, before.personalSpaceId);
    if ((before.relevance ?? 3) !== queueState.releasedLevel) return Response.json({ error: `Esta Cíclica está no nível ${before.relevance ?? 3}; o nível liberado agora é ${queueState.releasedLevel}.`, releasedLevel: queueState.releasedLevel }, { status: 409 });
  }
  const cyclicCompletion = before.taskType === "cyclic" && (payload.approve === true || (payload.status === "completed" && !(payload.approvalRequired ?? before.approvalRequired)));
  let cancellationPlan: { decision: "release" | "cascade"; successors: typeof tasks.$inferSelect[]; affected: typeof tasks.$inferSelect[] } | null = null;
  if (payload.status === "cancelled") {
    if (payload.cancelDecision !== undefined && payload.cancelDecision !== "release" && payload.cancelDecision !== "cascade") return Response.json({ error: "Decisão de cancelamento inválida." }, { status: 400 });
    const successors = await dependencySuccessors(context, id);
    if (successors.length && !payload.cancelDecision) return Response.json({ error: "Escolha o que fazer com as sucessoras antes de cancelar.", requiresCancellationDecision: true, successors: successors.map((successor) => ({ id: successor.id, title: successor.title, status: successor.status })), cascadeTargets: successors.filter((successor) => !["completed", "cancelled", "archived"].includes(successor.status)).map((successor) => ({ id: successor.id, title: successor.title })) }, { status: 409 });
    if (payload.cancelDecision) {
      for (const successor of successors) {
        if (!(await canAccessTask(context.db, context.user.id, successor.id, context.space.id, "interact"))) {
          return Response.json({ error: "Tarefa não encontrada." }, { status: 404 });
        }
      }
      const cascadeTargets = successors.filter((successor) => !["completed", "cancelled", "archived"].includes(successor.status));
      cancellationPlan = { decision: payload.cancelDecision, successors, affected: payload.cancelDecision === "cascade" ? [before, ...cascadeTargets] : [before, ...successors] };
    }
  }
  if (before.taskType === "date" && payload.status !== undefined) return Response.json({ error: "Marcos do tipo Data não representam trabalho e não podem ser concluídos manualmente." }, { status: 400 });
  if (payload.dateAt !== undefined) {
    if (before.taskType !== "date") return Response.json({ error: "Somente tarefas do tipo Data possuem data de marco." }, { status: 400 });
    const dateError = dateMarkerError("date", payload.dateAt);
    if (dateError) return Response.json({ error: dateError }, { status: 400 });
    update.dateAt = payload.dateAt;
  }
  if (payload.durationMinutes !== undefined || (before.taskType === "commitment" && payload.startAt !== undefined)) {
    if (before.taskType !== "commitment") return Response.json({ error: "Somente tarefas do tipo Compromisso possuem início e duração." }, { status: 400 });
    const timeError = commitmentTimeError("commitment", payload.startAt ?? before.startAt, payload.durationMinutes ?? before.durationMinutes);
    if (timeError) return Response.json({ error: timeError }, { status: 400 });
    update.startAt = payload.startAt ?? before.startAt;
    update.durationMinutes = payload.durationMinutes ?? before.durationMinutes;
  }
  if (payload.startAt !== undefined || payload.endAt !== undefined) {
    if (before.taskType !== "event") return Response.json({ error: "Somente tarefas do tipo Evento possuem início e término." }, { status: 400 });
    const timeError = eventTimeError("event", payload.startAt ?? before.startAt, payload.endAt ?? before.endAt);
    if (timeError) return Response.json({ error: timeError }, { status: 400 });
    update.startAt = payload.startAt ?? before.startAt;
    update.endAt = payload.endAt ?? before.endAt;
  }
  let subtaskCascade: { resolution: "complete" | "cancel"; children: typeof tasks.$inferSelect[] } | null = null;
  if (payload.status === "completed" && !before.parentTaskId) {
    const children = await context.db.select().from(tasks).where(eq(tasks.parentTaskId, id));
    const pendingChildren = children.filter((child) => !["completed", "cancelled", "archived"].includes(child.status));
    if (pendingChildren.length > 0) {
      if (payload.subtaskResolution !== "complete" && payload.subtaskResolution !== "cancel") return Response.json({ error: `Esta tarefa possui ${pendingChildren.length} subtarefa${pendingChildren.length === 1 ? "" : "s"} pendente${pendingChildren.length === 1 ? "" : "s"}. Escolha concluí-las ou cancelá-las antes de concluir a tarefa-mãe.`, requiresSubtaskResolution: true, pendingSubtasks: pendingChildren.length }, { status: 409 });
      for (const child of pendingChildren) if (!(await canAccessTask(context.db, context.user.id, child.id, context.space.id, "interact"))) return Response.json({ error: "Tarefa não encontrada." }, { status: 404 });
      subtaskCascade = { resolution: payload.subtaskResolution, children: pendingChildren };
    }
  }
  if (payload.approve) {
    if (!before.approvalRequired || before.status !== "awaiting_approval") return Response.json({ error: "Esta tarefa não está aguardando aprovação." }, { status: 400 });
    if (!(await canAccessTask(context.db, context.user.id, id, context.space.id, "approve"))) return Response.json({ error: "Tarefa não encontrada." }, { status: 404 });
  }
  if (payload.approve || (payload.status !== undefined && ["in_progress", "awaiting_approval", "completed"].includes(payload.status))) {
    const blockers = await dependencyBlockers(context, id);
    if (blockers.length) return Response.json({ error: `Esta tarefa está bloqueada por ${blockers.map((task) => `“${task.title}”`).join(", ")}. Conclua ou aguarde a liberação de todas as predecessoras.`, blockers: blockers.map((task) => ({ id: task.id, title: task.title })) }, { status: 409 });
  }
  if (payload.approvalRequired !== undefined) {
    if (typeof payload.approvalRequired !== "boolean") return Response.json({ error: "Configuração de aprovação inválida." }, { status: 400 });
    if (before.taskType === "date" && payload.approvalRequired) return Response.json({ error: "Tarefas do tipo Data não exigem aprovação." }, { status: 400 });
    update.approvalRequired = taskApprovalRequired(before.taskType, payload.approvalRequired);
  }
  if (payload.status !== undefined) {
    if (!workStates.includes(payload.status)) return Response.json({ error: "Status inválido." }, { status: 400 });
    const current = (before.status) as WorkState;
    if (!canTransitionWorkState(current, payload.status)) return Response.json({ error: `Não é permitido mudar de ${workStateLabel[current]} para ${workStateLabel[payload.status]}.` }, { status: 409 });
    const approvalRequired = payload.approvalRequired ?? before.approvalRequired;
    const requestedStatus = statusAfterApprovalConfiguration(payload.status, approvalRequired);
    update.status = cyclicCompletion ? "todo" : requestedStatus;
    update.completedAt = cyclicCompletion ? null : update.status === "completed" ? new Date().toISOString() : null;
  }
  if (payload.approve) {
    update.status = before.taskType === "cyclic" ? "todo" : "completed";
    update.completedAt = before.taskType === "cyclic" ? null : before.completedAt ?? new Date().toISOString();
    update.approvedAt = new Date().toISOString();
    update.approvedByUserId = context.user.id;
  }
  if (Object.keys(update).length === 1) return Response.json({ error: "Nenhuma alteração recebida." }, { status: 400 });
  let task: typeof tasks.$inferSelect;
  let cyclicCompletionResult: { position: number; releasedLevel: number } | null = null;
  if (cancellationPlan) {
    const changedAt = new Date().toISOString();
    const affected = cancellationPlan.affected;
    const statusUpdates = affected.map((item) => context.db.update(tasks).set(item.id === before.id ? { ...update, status: "cancelled", completedAt: null, updatedAt: changedAt } : { status: "cancelled", completedAt: null, updatedAt: changedAt }).where(eq(tasks.id, item.id)));
    const auditRows = affected.map((item) => context.db.insert(auditEvents).values({
      id: crypto.randomUUID(),
      personalSpaceId: item.organizationId ? null : context.space.id,
      organizationId: item.organizationId,
      actorUserId: context.user.id,
      actorName: context.user.displayName,
      action: "task_status_changed",
      subjectType: "task",
      subjectId: item.id,
      summary: item.id === before.id
        ? `cancelou a tarefa “${item.title}” com a decisão “${cancellationPlan!.decision === "release" ? "liberar sucessoras" : "cancelar sucessoras em cascata"}”.`
        : cancellationPlan!.decision === "cascade"
          ? `foi cancelada em cascata após o cancelamento da tarefa “${before.title}”.`
          : `entrou no alcance da decisão de liberar sucessoras após o cancelamento de “${before.title}”.`,
    }));
    await context.db.batch([...statusUpdates, ...auditRows]);
    const [updated] = await context.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!updated) return Response.json({ error: "Tarefa não encontrada." }, { status: 404 });
    task = updated;
  } else {
    const [updated] = await context.db.update(tasks).set(update).where(eq(tasks.id, id)).returning();
    if (!updated) return Response.json({ error: "Tarefa não encontrada." }, { status: 404 });
    task = updated;
  }
  if (subtaskCascade?.children.length) {
    const childStatus = subtaskCascade.resolution === "complete" ? "completed" : "cancelled";
    await context.db.update(tasks).set({ status: childStatus, completedAt: childStatus === "completed" ? new Date().toISOString() : null, updatedAt: new Date().toISOString() }).where(inArray(tasks.id, subtaskCascade.children.map((child) => child.id)));
  }
  if (cyclicCompletion) {
    const result = await completeCyclicTask(context.db, task);
    if (!result.task || result.position === undefined || result.releasedLevel === undefined) return Response.json({ error: result.error }, { status: 409 });
    task = result.task;
    cyclicCompletionResult = { position: result.position, releasedLevel: result.releasedLevel };
  }
  if (tagNames !== undefined) {
    await context.db.delete(taskTags).where(eq(taskTags.taskId, id));
    for (const name of tagNames) {
      await context.db.insert(tags).values({ id: crypto.randomUUID(), personalSpaceId: context.space.id, name }).onConflictDoNothing();
      const [tag] = await context.db.select().from(tags).where(and(eq(tags.personalSpaceId, context.space.id), eq(tags.name, name))).limit(1);
      if (tag) await context.db.insert(taskTags).values({ taskId: id, tagId: tag.id }).onConflictDoNothing();
    }
  }
  if (!cancellationPlan && cyclicCompletion && cyclicCompletionResult) {
    await recordAuditEvent(context.db, {
      personalSpaceId: task.organizationId ? null : context.space.id, organizationId: task.organizationId,
      actorUserId: context.user.id, actorName: context.user.displayName, action: "task_completed", subjectType: "task", subjectId: task.id,
      summary: `concluiu a Cíclica “${task.title}” e a reinseriu na posição ${cyclicCompletionResult.position} da fila; nível liberado agora: ${cyclicCompletionResult.releasedLevel}.`,
    });
  } else if (!cancellationPlan && payload.status !== undefined && update.status !== before.status) {
    await recordAuditEvent(context.db, {
      personalSpaceId: task.organizationId ? null : context.space.id, organizationId: task.organizationId,
      actorUserId: context.user.id,
      actorName: context.user.displayName,
      action: "task_status_changed",
      subjectType: "task",
      subjectId: task.id,
      summary: `alterou o estado de “${task.title}” de ${workStateLabel[(before.status) as WorkState]} para ${workStateLabel[update.status as WorkState]}${payload.reason?.trim() ? `: ${payload.reason.trim()}` : "."}`,
    });
  }
  if (subtaskCascade?.children.length) {
    const verb = subtaskCascade.resolution === "complete" ? "concluiu" : "cancelou";
    const childLabel = subtaskCascade.children.length === 1 ? "subtarefa pendente" : `${subtaskCascade.children.length} subtarefas pendentes`;
    await recordAuditEvent(context.db, {
      personalSpaceId: task.organizationId ? null : context.space.id, organizationId: task.organizationId,
      actorUserId: context.user.id, actorName: context.user.displayName, action: "task_subtasks_cascade", subjectType: "task", subjectId: task.id,
      summary: `${verb} ${childLabel} ao concluir a tarefa-mãe “${task.title}”.`,
    });
    for (const child of subtaskCascade.children) await recordAuditEvent(context.db, {
      personalSpaceId: child.organizationId ? null : context.space.id, organizationId: child.organizationId,
      actorUserId: context.user.id, actorName: context.user.displayName, action: "task_subtasks_cascade", subjectType: "task", subjectId: child.id,
      summary: `${verb} esta subtarefa ao concluir a tarefa-mãe “${task.title}”.`,
    });
  }
  if (task.status === "awaiting_approval" && before.status !== "awaiting_approval") {
    await recordApprovalRequested(context.db, {
      organizationId: task.organizationId,
      personalSpaceId: task.organizationId ? null : context.space.id,
      actorUserId: context.user.id,
      actorName: context.user.displayName,
      subjectType: "task",
      subjectId: task.id,
      title: task.title,
      previousStatus: (before.status) as WorkState,
    });
  }
  if (payload.status !== undefined || payload.approve || payload.dateAt !== undefined || payload.endAt !== undefined) await refreshDependencyReleases(context);
  if (payload.status !== undefined || payload.approve) await refreshPhaseCompletionForTask(context, id);
  if (payload.status !== undefined || payload.approve) await refreshProcessCompletionForItem(context, id);
  const wasEdited = payload.title !== undefined || payload.description !== undefined || payload.dueDate !== undefined || payload.dateAt !== undefined || payload.startAt !== undefined || payload.endAt !== undefined || payload.durationMinutes !== undefined || payload.tags !== undefined || payload.approvalRequired !== undefined || payload.size !== undefined || payload.importance !== undefined || payload.urgency !== undefined || payload.relevance !== undefined;
  if (wasEdited) {
    const changedFields = [payload.title !== undefined && "título", payload.description !== undefined && "descrição", payload.dueDate !== undefined && "prazo", payload.dateAt !== undefined && "data do marco", (payload.startAt !== undefined || payload.durationMinutes !== undefined || payload.endAt !== undefined) && "horário", payload.tags !== undefined && "tags", (payload.size !== undefined || payload.importance !== undefined || payload.urgency !== undefined) && "priorização", payload.relevance !== undefined && "relevância cíclica"].filter(Boolean).join(", ");
    await recordAuditEvent(context.db, {
      personalSpaceId: task.organizationId ? null : context.space.id, organizationId: task.organizationId,
      actorUserId: context.user.id,
      actorName: context.user.displayName,
      action: "task_edited",
      subjectType: "task",
      subjectId: task.id,
      summary: `editou ${changedFields} da tarefa “${task.title}”.`,
    });
  }
  const assignedTags = await context.db.select({ id: tags.id, name: tags.name }).from(taskTags).innerJoin(tags, eq(taskTags.tagId, tags.id)).where(eq(taskTags.taskId, id));
  const checklist = await context.db.select({ completed: checklistItems.completed }).from(checklistItems).where(eq(checklistItems.taskId, id));
  return Response.json({ task: { ...task, tags: assignedTags, checklistTotal: checklist.length, checklistCompleted: checklist.filter((item) => item.completed).length } });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  if (!(await canAccessTask(context.db, context.user.id, id, context.space.id, "delete"))) return Response.json({ error: "Tarefa não encontrada." }, { status: 404 });
  const [occurrence] = await context.db.select({ id: recurrenceOccurrences.id }).from(recurrenceOccurrences).where(eq(recurrenceOccurrences.taskId, id)).limit(1);
  if (occurrence) return Response.json({ error: "Ocorrências materializadas fazem parte do histórico da série e não podem ser excluídas. Arquive ou cancele a ocorrência." }, { status: 409 });
  const [current] = await context.db.select({ id: tasks.id, title: tasks.title, organizationId: tasks.organizationId, status: tasks.status, deletedAt: tasks.deletedAt }).from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!current) return Response.json({ error: "Tarefa não encontrada." }, { status: 404 });
  if (current.deletedAt) return Response.json({ error: "Esta tarefa já está na lixeira." }, { status: 409 });
  const children = await context.db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.parentTaskId, id), isNull(tasks.deletedAt))).limit(1);
  if (children.length) return Response.json({ error: "Conclua, cancele ou mova as subtarefas antes de excluir a tarefa-mãe, para não criar órfãos." }, { status: 409 });
  const deletedAt = new Date().toISOString();
  const [task] = await context.db.update(tasks).set({ deletedAt, deletedStatus: current.status, status: "archived", updatedAt: deletedAt }).where(and(eq(tasks.id, id), isNull(tasks.deletedAt))).returning({ id: tasks.id, title: tasks.title, organizationId: tasks.organizationId, deletedAt: tasks.deletedAt });
  if (!task) return Response.json({ error: "Tarefa não encontrada." }, { status: 404 });
  await recordAuditEvent(context.db, {
    personalSpaceId: task.organizationId ? null : context.space.id, organizationId: task.organizationId,
    actorUserId: context.user.id,
    actorName: context.user.displayName,
    action: "task_deleted",
    subjectType: "task",
    subjectId: task.id,
    summary: `excluiu a tarefa “${task.title}”.`,
  });
  return Response.json({ id: task.id, deletedAt: task.deletedAt, message: "Tarefa movida para a lixeira. As relações foram preservadas." });
}
