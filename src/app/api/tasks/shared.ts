import { and, eq } from "drizzle-orm";
import { canAccessFront, canAccessOrganization, canAccessPhase, canAccessProcess, canAccessProduct, canAccessProject, canItem } from "../../../db/authorization";
import { recordAuditEvent } from "../../../db/audit";
import { createNotification } from "../../../db/notifications";
import { departments, fronts, hierarchyAttachments, itemRoleAssignments, organizationMembers, organizations, phases, processes, products, projects, taskAssignees, tasks, teams } from "../../../db/schema";
import { commitmentTimeError, dateMarkerError, eventTimeError, taskTypeError, type TaskParentType, type TaskType } from "../../../db/task-types";
import { taskApprovalRequired } from "../../../db/approval";
import { createRecurrenceSeries, firstMaterializedTask, materializeSeries, parseRecurrenceDefinition, recurrenceTaskTypes } from "../../../db/recurrence";
import { nextCyclicPosition, normalizeCyclicRelevance } from "../../../db/cyclic";

export type TaskParent = { parentType: TaskParentType | null; parentId: string | null };
type Context = NonNullable<Awaited<ReturnType<typeof import("../../../db/current-user").ensurePersonalContext>>>;

export async function resolveTaskParent(context: Context, parentType: TaskParentType | null, parentId: string | null, capability: "view" | "add_children" = "add_children") {
  if (!parentType && !parentId) return { allowed: true, organizationId: null as string | null, name: "Área pessoal" };
  if (!parentType || !parentId) return { allowed: false, organizationId: null, name: "" };
  if (parentType === "organization") {
    const [item] = await context.db.select().from(organizations).where(eq(organizations.id, parentId)).limit(1);
    return { allowed: Boolean(item && await canAccessOrganization(context.db, context.user.id, context.user.email, parentId, capability)), organizationId: item?.id ?? null, name: item?.name ?? "" };
  }
  if (parentType === "department" || parentType === "team") {
    const table = parentType === "department" ? departments : teams;
    const [item] = await context.db.select().from(table).where(eq(table.id, parentId)).limit(1);
    const allowed = Boolean(item && (item.ownerUserId === context.user.id || await canItem(context.db, context.user.id, parentType, parentId, capability) || (item.organizationId !== null && await canAccessOrganization(context.db, context.user.id, context.user.email, item.organizationId, capability))));
    return { allowed, organizationId: item?.organizationId ?? null, name: item?.name ?? "" };
  }
  if (parentType === "project") {
    const [item] = await context.db.select().from(projects).where(eq(projects.id, parentId)).limit(1);
    return { allowed: Boolean(item && await canAccessProject(context.db, context.user.id, parentId, context.space.id, capability)), organizationId: item?.organizationId ?? null, name: item?.title ?? "" };
  }
  if (parentType === "front") {
    const [item] = await context.db.select().from(fronts).where(eq(fronts.id, parentId)).limit(1);
    return { allowed: Boolean(item && await canAccessFront(context.db, context.user.id, parentId, context.space.id, capability)), organizationId: item?.organizationId ?? null, name: item?.title ?? "" };
  }
  if (parentType === "product") {
    const [item] = await context.db.select().from(products).where(eq(products.id, parentId)).limit(1);
    return { allowed: Boolean(item && await canAccessProduct(context.db, context.user.id, parentId, context.space.id, capability)), organizationId: item?.organizationId ?? null, name: item?.title ?? "" };
  }
  if (parentType === "process") {
    const [item] = await context.db.select().from(processes).where(eq(processes.id, parentId)).limit(1);
    return { allowed: Boolean(item && await canAccessProcess(context.db, context.user.id, parentId, context.space.id, capability)), organizationId: item?.organizationId ?? null, name: item?.title ?? "" };
  }
  const [item] = await context.db.select().from(phases).where(eq(phases.id, parentId)).limit(1);
  return { allowed: Boolean(item && await canAccessPhase(context.db, context.user.id, parentId, context.space.id, capability)), organizationId: item?.organizationId ?? null, name: item?.title ?? "" };
}

export async function createTask(context: Context, payload: {
  title?: string; description?: string; dueDate?: string | null; taskType?: string; approvalRequired?: boolean;
  size?: "xs" | "s" | "m" | "l" | "xl" | null; importance?: "low" | "medium" | "high" | null; urgency?: "low" | "medium" | "high" | null;
  relevance?: number | null; parentType?: TaskParentType | null; parentId?: string | null; assigneeIds?: string[]; startAt?: string | null; endAt?: string | null; durationMinutes?: number | null; dateAt?: string | null; recurrenceDefinition?: unknown;
}) {
  const title = payload.title?.trim().replace(/\s+/g, " ") ?? "";
  const parentType = payload.parentType ?? null;
  const parentId = payload.parentId ?? null;
  const taskType = payload.taskType ?? "simple";
  if (taskType === "reminder") return { error: "Lembretes são criados pela seção Lembretes, não como tarefas." };
  const approvalRequired = taskApprovalRequired(taskType, payload.approvalRequired);
  const cyclicRelevance = normalizeCyclicRelevance(taskType, payload.relevance);
  if (!title || title.length > 160) return { error: "Informe um título de até 160 caracteres." };
  if (payload.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(payload.dueDate)) return { error: "Use uma data válida." };
  if (payload.size !== undefined && payload.size !== null && !["xs", "s", "m", "l", "xl"].includes(payload.size)) return { error: "Tamanho de tarefa inválido." };
  if (payload.importance !== undefined && payload.importance !== null && !["low", "medium", "high"].includes(payload.importance)) return { error: "Importância de tarefa inválida." };
  if (payload.urgency !== undefined && payload.urgency !== null && !["low", "medium", "high"].includes(payload.urgency)) return { error: "Urgência de tarefa inválida." };
  if (cyclicRelevance.error) return { error: cyclicRelevance.error };
  const typeError = taskTypeError(taskType, parentType);
  if (typeError) return { error: typeError };
  const timeError = commitmentTimeError(taskType, payload.startAt, payload.durationMinutes);
  if (timeError) return { error: timeError };
  const eventError = eventTimeError(taskType, payload.startAt, payload.endAt);
  if (eventError) return { error: eventError };
  const dateError = dateMarkerError(taskType, payload.dateAt);
  if (dateError) return { error: dateError };
  const target = await resolveTaskParent(context, parentType, parentId);
  if (!target.allowed) return { error: "Você não pode criar uma tarefa neste local." };
  const assigneeIds = [...new Set((payload.assigneeIds ?? []).filter(Boolean))];
  if (target.organizationId && assigneeIds.length) {
    for (const userId of assigneeIds) {
      if (userId === (await context.db.select({ ownerUserId: organizations.ownerUserId }).from(organizations).where(eq(organizations.id, target.organizationId)).limit(1))[0]?.ownerUserId) continue;
      const [member] = await context.db.select({ id: organizationMembers.id }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, target.organizationId), eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active"))).limit(1);
      if (!member) return { error: "Todo responsável precisa ser membro ativo da organização." };
    }
  }
  if (recurrenceTaskTypes.includes(taskType as typeof recurrenceTaskTypes[number])) {
    const parsed = parseRecurrenceDefinition(payload.recurrenceDefinition, taskType);
    if (parsed.error || !parsed.definition) return { error: parsed.error ?? "Definição de recorrência inválida." };
    const series = await createRecurrenceSeries(context, {
      title, description: payload.description, taskType: taskType as typeof recurrenceTaskTypes[number],
      definition: parsed.definition, parentType, parentId, organizationId: target.organizationId,
    });
    const materialized = await materializeSeries(context, series, undefined, {
      assigneeIds, size: payload.size, importance: payload.importance, urgency: payload.urgency, approvalRequired,
    });
    if (materialized.error) return { error: materialized.error };
    const firstTask = await firstMaterializedTask(context, series.id);
    if (!firstTask) return { error: "A série foi criada, mas ainda não há uma ocorrência dentro da janela atual." };
    return { task: { ...firstTask, parentName: target.name, tags: [], checklistTotal: 0, checklistCompleted: 0 }, series };
  }
  const [task] = await context.db.insert(tasks).values({
    id: crypto.randomUUID(), personalSpaceId: context.space.id, authorUserId: context.user.id, ownerUserId: context.user.id,
    organizationId: target.organizationId, title, description: payload.description?.trim() ?? "", taskType: taskType as TaskType, dueDate: payload.dueDate?.trim() || null, dateAt: taskType === "date" ? payload.dateAt! : null, startAt: taskType === "commitment" || taskType === "event" ? payload.startAt! : null, endAt: taskType === "event" ? payload.endAt! : null, durationMinutes: taskType === "commitment" ? payload.durationMinutes! : null,
    status: "todo", approvalRequired, size: payload.size ?? null, importance: payload.importance ?? null, urgency: payload.urgency ?? null,
    relevance: cyclicRelevance.value, cyclicPosition: taskType === "cyclic" ? await nextCyclicPosition(context.db, context.space.id) : 999999, cyclicReentryCount: 0,
  }).returning();
  await context.db.insert(hierarchyAttachments).values({ id: crypto.randomUUID(), childType: "task", childId: task.id, parentType, parentId });
  await context.db.insert(itemRoleAssignments).values({ id: crypto.randomUUID(), itemType: "task", itemId: task.id, userId: context.user.id, role: "owner" }).onConflictDoNothing();
  for (const userId of assigneeIds) {
    await context.db.insert(taskAssignees).values({ taskId: task.id, userId }).onConflictDoNothing();
    if (userId !== context.user.id) {
      await context.db.insert(itemRoleAssignments).values({ id: crypto.randomUUID(), itemType: "task", itemId: task.id, userId, role: "executor" }).onConflictDoNothing();
      await createNotification(context.db, { recipientUserId: userId, actorUserId: context.user.id, taskId: task.id, type: "assignment", eventKey: `assignment:${task.id}:${userId}`, summary: `${context.user.displayName} atribuiu a tarefa “${task.title}” a você.` });
    }
  }
  await recordAuditEvent(context.db, { organizationId: target.organizationId ?? undefined, personalSpaceId: target.organizationId ? undefined : context.space.id, actorUserId: context.user.id, actorName: context.user.displayName, action: "task_created", subjectType: "task", subjectId: task.id, summary: `criou a tarefa “${task.title}”${target.name ? ` em “${target.name}”` : ""}.` });
  return { task: { ...task, parentName: target.name, tags: [], checklistTotal: 0, checklistCompleted: 0 } };
}
