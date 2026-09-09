import { and, asc, eq, isNull } from "drizzle-orm";
import { ensurePersonalContext } from "../../../../../db/current-user";
import { createNotification } from "../../../../../db/notifications";
import { canAccessOrganization } from "../../../../../db/authorization";
import { departments, hierarchyAttachments, itemRoleAssignments, organizationMembers, organizations, taskAssignees, tasks, teams, users } from "../../../../../db/schema";
import { commitmentTimeError, dateMarkerError, eventTimeError, taskTypeError } from "../../../../../db/task-types";
import { taskApprovalRequired } from "../../../../../db/approval";
import { createRecurrenceSeries, firstMaterializedTask, materializeSeries, parseRecurrenceDefinition, recurrenceTaskTypes } from "../../../../../db/recurrence";
import { nextCyclicPosition, normalizeCyclicRelevance } from "../../../../../db/cyclic";

async function orgContext(id: string) {
  const context = await ensurePersonalContext(); if (!context) return { context: null, organization: null, canView: false, canCreate: false };
  const [organization] = await context.db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  if (!organization) return { context, organization: null, canView: false, canCreate: false };
  return { context, organization, canView: await canAccessOrganization(context.db, context.user.id, context.user.email, id, "view"), canCreate: await canAccessOrganization(context.db, context.user.id, context.user.email, id, "add_children") };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { context, organization, canView } = await orgContext(id);
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 }); if (!organization || !canView) return Response.json({ error: "Sem acesso à organização." }, { status: 403 });
  const rows = await context.db.select().from(tasks).where(and(eq(tasks.organizationId, id), isNull(tasks.parentTaskId), isNull(tasks.deletedAt))).orderBy(asc(tasks.createdAt));
  const assignments = await context.db.select({ taskId: taskAssignees.taskId, userId: users.id, displayName: users.displayName }).from(taskAssignees).innerJoin(users, eq(taskAssignees.userId, users.id));
  const attachments = await context.db.select().from(hierarchyAttachments);
  const departmentsById = new Map((await context.db.select().from(departments).where(eq(departments.organizationId, id))).map((item) => [item.id, item.name]));
  const teamsById = new Map((await context.db.select().from(teams).where(eq(teams.organizationId, id))).map((item) => [item.id, item.name]));
  return Response.json({ tasks: rows.map((task) => { const attachment = attachments.find((item) => item.childType === "task" && item.childId === task.id); const parentName = attachment?.parentType === "department" ? departmentsById.get(attachment.parentId ?? "") : attachment?.parentType === "team" ? teamsById.get(attachment.parentId ?? "") : organization.name; return { ...task, location: `em ${parentName ?? organization.name}`, assignees: assignments.filter((item) => item.taskId === task.id).map(({ userId, displayName }) => ({ userId, displayName })) }; }) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { context, organization, canCreate } = await orgContext(id);
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 }); if (!organization || !canCreate) return Response.json({ error: "Você não pode criar tarefas nesta organização." }, { status: 403 });
  const payload = await request.json() as { title?: string; description?: string; dueDate?: string | null; dateAt?: string | null; taskType?: string; approvalRequired?: boolean; size?: "xs" | "s" | "m" | "l" | "xl" | null; importance?: "low" | "medium" | "high" | null; urgency?: "low" | "medium" | "high" | null; relevance?: number | null; parentType?: "organization" | "department" | "team"; parentId?: string; assigneeIds?: string[]; startAt?: string | null; endAt?: string | null; durationMinutes?: number | null; recurrenceDefinition?: unknown };
  const title = payload.title?.trim() ?? ""; const parentType = payload.parentType ?? "organization"; const parentId = payload.parentId ?? id; const assigneeIds = [...new Set(payload.assigneeIds ?? [])];
  if (!title || !assigneeIds.length || !["organization", "department", "team"].includes(parentType)) return Response.json({ error: "Informe título, local e ao menos um responsável." }, { status: 400 });
  if (payload.size !== undefined && payload.size !== null && !["xs", "s", "m", "l", "xl"].includes(payload.size)) return Response.json({ error: "Tamanho de tarefa inválido." }, { status: 400 });
  if (payload.importance !== undefined && payload.importance !== null && !["low", "medium", "high"].includes(payload.importance)) return Response.json({ error: "Importância de tarefa inválida." }, { status: 400 });
  if (payload.urgency !== undefined && payload.urgency !== null && !["low", "medium", "high"].includes(payload.urgency)) return Response.json({ error: "Urgência de tarefa inválida." }, { status: 400 });
  const typeError = taskTypeError(payload.taskType ?? "simple", parentType); if (typeError) return Response.json({ error: typeError }, { status: 400 });
  const timeError = commitmentTimeError(payload.taskType ?? "simple", payload.startAt, payload.durationMinutes); if (timeError) return Response.json({ error: timeError }, { status: 400 });
  const eventError = eventTimeError(payload.taskType ?? "simple", payload.startAt, payload.endAt); if (eventError) return Response.json({ error: eventError }, { status: 400 });
  const dateError = dateMarkerError(payload.taskType ?? "simple", payload.dateAt); if (dateError) return Response.json({ error: dateError }, { status: 400 });
  if (parentType === "organization" && parentId !== id) return Response.json({ error: "Organização pai inválida." }, { status: 400 });
  if (parentType === "department") { const [parent] = await context.db.select({ id: departments.id }).from(departments).where(and(eq(departments.id, parentId), eq(departments.organizationId, id))).limit(1); if (!parent) return Response.json({ error: "Departamento inválido." }, { status: 400 }); }
  if (parentType === "team") { const [parent] = await context.db.select({ id: teams.id }).from(teams).where(and(eq(teams.id, parentId), eq(teams.organizationId, id))).limit(1); if (!parent) return Response.json({ error: "Time inválido." }, { status: 400 }); }
  for (const userId of assigneeIds) {
    // O Owner tem acesso à organização por definição e pode ser responsável,
    // mesmo que não exista uma linha redundante em organization_members.
    if (userId === organization.ownerUserId) continue;
    const [member] = await context.db.select({ id: organizationMembers.id }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, id), eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active"))).limit(1);
    if (!member) return Response.json({ error: "Todo responsável precisa ser membro ativo." }, { status: 400 });
  }
  const taskType = payload.taskType ?? "simple";
  const approvalRequired = taskApprovalRequired(taskType, payload.approvalRequired);
  const cyclicRelevance = normalizeCyclicRelevance(taskType, payload.relevance);
  if (cyclicRelevance.error) return Response.json({ error: cyclicRelevance.error }, { status: 400 });
  if (recurrenceTaskTypes.includes(taskType as typeof recurrenceTaskTypes[number])) {
    const parsed = parseRecurrenceDefinition(payload.recurrenceDefinition, taskType);
    if (parsed.error || !parsed.definition) return Response.json({ error: parsed.error ?? "Definição de recorrência inválida." }, { status: 400 });
    const series = await createRecurrenceSeries(context, { title, description: payload.description, taskType: taskType as typeof recurrenceTaskTypes[number], definition: parsed.definition, parentType, parentId, organizationId: id });
    const materialized = await materializeSeries(context, series, undefined, { assigneeIds, size: payload.size, importance: payload.importance, urgency: payload.urgency, approvalRequired });
    if (materialized.error) return Response.json({ error: materialized.error }, { status: 400 });
    const firstTask = await firstMaterializedTask(context, series.id);
    if (!firstTask) return Response.json({ error: "A série foi criada, mas ainda não há uma ocorrência dentro da janela atual." }, { status: 400 });
    return Response.json({ task: firstTask, series }, { status: 201 });
  }
  const [task] = await context.db.insert(tasks).values({ id: crypto.randomUUID(), personalSpaceId: context.space.id, authorUserId: context.user.id, ownerUserId: context.user.id, organizationId: id, title, description: payload.description?.trim() ?? "", taskType: taskType as typeof tasks.$inferInsert.taskType, dueDate: payload.dueDate?.trim() || null, dateAt: taskType === "date" ? payload.dateAt! : null, startAt: taskType === "commitment" || taskType === "event" ? payload.startAt! : null, endAt: taskType === "event" ? payload.endAt! : null, durationMinutes: taskType === "commitment" ? payload.durationMinutes! : null, status: "todo", approvalRequired, size: payload.size ?? null, importance: payload.importance ?? null, urgency: payload.urgency ?? null, relevance: cyclicRelevance.value, cyclicPosition: taskType === "cyclic" ? await nextCyclicPosition(context.db, context.space.id) : 999999, cyclicReentryCount: 0 }).returning();
  await context.db.insert(hierarchyAttachments).values({ id: crypto.randomUUID(), childType: "task", childId: task.id, parentType, parentId });
  await context.db.insert(itemRoleAssignments).values({ id: crypto.randomUUID(), itemType: "task", itemId: task.id, userId: context.user.id, role: "owner" });
  for (const userId of assigneeIds) { await context.db.insert(taskAssignees).values({ taskId: task.id, userId }).onConflictDoNothing(); if (userId !== context.user.id) { await context.db.insert(itemRoleAssignments).values({ id: crypto.randomUUID(), itemType: "task", itemId: task.id, userId, role: "executor" }).onConflictDoNothing(); await createNotification(context.db, { recipientUserId: userId, actorUserId: context.user.id, taskId: task.id, type: "assignment", eventKey: `assignment:${task.id}:${userId}`, summary: `${context.user.displayName} atribuiu a tarefa “${task.title}” a você.` }); } }
  return Response.json({ task }, { status: 201 });
}
