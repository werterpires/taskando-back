import { and, eq, inArray, isNull } from "drizzle-orm";
import { canAccessProject, canAccessTask } from "../../../../../db/authorization";
import { recordAuditEvent } from "../../../../../db/audit";
import { ensurePersonalContext } from "../../../../../db/current-user";
import { hierarchyAttachments, itemRoleAssignments, projects, tasks } from "../../../../../db/schema";
import { commitmentTimeError, dateMarkerError, eventTimeError, taskTypeError } from "../../../../../db/task-types";
import { taskApprovalRequired } from "../../../../../db/approval";
import { createRecurrenceSeries, firstMaterializedTask, materializeSeries, parseRecurrenceDefinition, recurrenceTaskTypes } from "../../../../../db/recurrence";
import { nextCyclicPosition, normalizeCyclicRelevance } from "../../../../../db/cyclic";

const sizes = ["xs", "s", "m", "l", "xl"] as const;
const priorities = ["low", "medium", "high"] as const;

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  if (!await canAccessProject(context.db, context.user.id, id, context.space.id, "view")) return Response.json({ error: "Projeto não encontrado." }, { status: 404 });
  const attachments = await context.db.select({ childId: hierarchyAttachments.childId }).from(hierarchyAttachments).where(and(eq(hierarchyAttachments.parentType, "project"), eq(hierarchyAttachments.parentId, id)));
  const ids = attachments.map((item) => item.childId);
  if (!ids.length) return Response.json({ tasks: [] });
  const candidates = await context.db.select().from(tasks).where(and(inArray(tasks.id, ids), isNull(tasks.deletedAt)));
  const visible = await Promise.all(candidates.map(async (task) => await canAccessTask(context.db, context.user.id, task.id, context.space.id, "view") ? task : null));
  return Response.json({ tasks: visible.filter((task): task is typeof candidates[number] => task !== null).map((task) => ({ ...task, parentName: null, tags: [], checklistTotal: 0, checklistCompleted: 0 })) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  const [project] = await context.db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project || !await canAccessProject(context.db, context.user.id, id, context.space.id, "add_children")) return Response.json({ error: "Você não pode criar tarefas neste projeto." }, { status: 403 });
  const payload = await request.json() as { title?: string; description?: string; dueDate?: string | null; dateAt?: string | null; taskType?: string; approvalRequired?: boolean; size?: typeof sizes[number] | null; importance?: typeof priorities[number] | null; urgency?: typeof priorities[number] | null; relevance?: number | null; startAt?: string | null; endAt?: string | null; durationMinutes?: number | null; recurrenceDefinition?: unknown };
  const title = payload.title?.trim().replace(/\s+/g, " ") ?? "";
  const dueDate = payload.dueDate?.trim() || null;
  if (!title || title.length > 160) return Response.json({ error: "Informe um título de até 160 caracteres." }, { status: 400 });
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return Response.json({ error: "Use uma data válida." }, { status: 400 });
  if (payload.size !== undefined && payload.size !== null && !sizes.includes(payload.size)) return Response.json({ error: "Tamanho de tarefa inválido." }, { status: 400 });
  if (payload.importance !== undefined && payload.importance !== null && !priorities.includes(payload.importance)) return Response.json({ error: "Importância de tarefa inválida." }, { status: 400 });
  if (payload.urgency !== undefined && payload.urgency !== null && !priorities.includes(payload.urgency)) return Response.json({ error: "Urgência de tarefa inválida." }, { status: 400 });
  const taskType = payload.taskType ?? "simple";
  const approvalRequired = taskApprovalRequired(taskType, payload.approvalRequired);
  const cyclicRelevance = normalizeCyclicRelevance(taskType, payload.relevance);
  if (cyclicRelevance.error) return Response.json({ error: cyclicRelevance.error }, { status: 400 });
  const typeError = taskTypeError(taskType, "project"); if (typeError) return Response.json({ error: typeError }, { status: 400 });
  const timeError = commitmentTimeError(taskType, payload.startAt, payload.durationMinutes); if (timeError) return Response.json({ error: timeError }, { status: 400 });
  const eventError = eventTimeError(taskType, payload.startAt, payload.endAt); if (eventError) return Response.json({ error: eventError }, { status: 400 });
  const dateError = dateMarkerError(taskType, payload.dateAt); if (dateError) return Response.json({ error: dateError }, { status: 400 });
  if (recurrenceTaskTypes.includes(taskType as typeof recurrenceTaskTypes[number])) {
    const parsed = parseRecurrenceDefinition(payload.recurrenceDefinition, taskType);
    if (parsed.error || !parsed.definition) return Response.json({ error: parsed.error ?? "Definição de recorrência inválida." }, { status: 400 });
    const series = await createRecurrenceSeries(context, { title, description: payload.description, taskType: taskType as typeof recurrenceTaskTypes[number], definition: parsed.definition, parentType: "project", parentId: id, organizationId: project.organizationId });
    const materialized = await materializeSeries(context, series, undefined, { size: payload.size, importance: payload.importance, urgency: payload.urgency, approvalRequired });
    if (materialized.error) return Response.json({ error: materialized.error }, { status: 400 });
    const firstTask = await firstMaterializedTask(context, series.id);
    if (!firstTask) return Response.json({ error: "A série foi criada, mas ainda não há uma ocorrência dentro da janela atual." }, { status: 400 });
    return Response.json({ task: { ...firstTask, parentName: null, tags: [], checklistTotal: 0, checklistCompleted: 0 }, series }, { status: 201 });
  }
  const [task] = await context.db.insert(tasks).values({ id: crypto.randomUUID(), personalSpaceId: context.space.id, organizationId: project.organizationId, authorUserId: context.user.id, ownerUserId: context.user.id, title, description: payload.description?.trim() ?? "", taskType: taskType as typeof tasks.$inferInsert.taskType, dueDate, dateAt: taskType === "date" ? payload.dateAt! : null, startAt: taskType === "commitment" || taskType === "event" ? payload.startAt! : null, endAt: taskType === "event" ? payload.endAt! : null, durationMinutes: taskType === "commitment" ? payload.durationMinutes! : null, status: "todo", approvalRequired, size: payload.size ?? null, importance: payload.importance ?? null, urgency: payload.urgency ?? null, relevance: cyclicRelevance.value, cyclicPosition: taskType === "cyclic" ? await nextCyclicPosition(context.db, context.space.id) : 999999, cyclicReentryCount: 0 }).returning();
  await context.db.insert(hierarchyAttachments).values({ id: crypto.randomUUID(), childType: "task", childId: task.id, parentType: "project", parentId: id });
  await context.db.insert(itemRoleAssignments).values({ id: crypto.randomUUID(), itemType: "task", itemId: task.id, userId: context.user.id, role: "owner" });
  await recordAuditEvent(context.db, { organizationId: project.organizationId ?? undefined, personalSpaceId: project.organizationId ? undefined : context.space.id, actorUserId: context.user.id, actorName: context.user.displayName, action: "task_created", subjectType: "task", subjectId: task.id, summary: `criou a tarefa “${task.title}” no projeto “${project.title}”.` });
  return Response.json({ task: { ...task, parentName: null, tags: [], checklistTotal: 0, checklistCompleted: 0 } }, { status: 201 });
}
