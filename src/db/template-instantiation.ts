import { and, asc, eq, max } from "drizzle-orm";
import { canAccessFront, canAccessOrganization, canAccessPhase, canAccessProcess, canAccessProduct, canAccessProject, canItem } from "./authorization";
import { taskApprovalRequired } from "./approval";
import { allowedParentTypes, validateAttachment, type HierarchyType } from "./hierarchy";
import { isTemplateSourceType, type TemplateSourceType } from "./item-templates";
import { parseRecurrenceDefinition, recurrenceOccurrenceDescriptor, recurrenceTaskTypes, type RecurrenceDefinition, type RecurrenceTaskType } from "./recurrence";
import { auditEvents, checklistItems, departments, dependencyEdges, fronts, hierarchyAttachments, itemRoleAssignments, itemTemplates, notifications, organizationMembers, organizations, phases, processes, products, projects, recurrenceOccurrences, recurrenceSeries, tags, taskAssignees, taskTags, tasks, teams, users } from "./schema";
import { canBeSubtask, canHaveSubtasks, commitmentTimeError, dateMarkerError, eventTimeError, taskTypeError, taskTypes, type TaskParentType, type TaskType } from "./task-types";
import type { ensurePersonalContext } from "./current-user";

type Context = NonNullable<Awaited<ReturnType<typeof ensurePersonalContext>>>;
type SnapshotNode = { localId: string; type: TemplateSourceType; fields: Record<string, unknown>; children: SnapshotNode[] };
type Snapshot = { schemaVersion: number; root: SnapshotNode; links: { dependencies: Array<{ predecessorType: "task" | "phase"; predecessorLocalId: string; successorType: "task" | "phase"; successorLocalId: string }> } };
export type InstantiationTarget = { type: HierarchyType | "personal"; id: string | null; name: string; organizationId: string | null; people: Array<{ id: string; displayName: string }> };

export class TemplateInstantiationError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}

const text = (value: unknown, maxLength: number, fallback = "") => typeof value === "string" ? value.trim().slice(0, maxLength) : fallback;
const nullableEnum = <T extends string>(value: unknown, allowed: readonly T[]) => value === null || value === undefined ? null : allowed.includes(value as T) ? value as T : null;
const boolean = (value: unknown) => value === true;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const parentLabels: Record<Exclude<HierarchyType, "task">, string> = { organization: "Organização", department: "Departamento", team: "Time", project: "Projeto", front: "Frente", product: "Produto", process: "Processo", phase: "Fase" };
const sizes = ["xs", "s", "m", "l", "xl"] as const;
const priorities = ["low", "medium", "high"] as const;

function parseSnapshot(raw: string, expectedType: TemplateSourceType) {
  let snapshot: Snapshot;
  try { snapshot = JSON.parse(raw) as Snapshot; } catch { throw new TemplateInstantiationError("O snapshot deste template está corrompido.", 409); }
  if (snapshot.schemaVersion !== 2 || !snapshot.root || snapshot.root.type !== expectedType || !Array.isArray(snapshot.root.children) || !Array.isArray(snapshot.links?.dependencies)) throw new TemplateInstantiationError("Este template usa uma versão de snapshot incompatível.", 409);
  const nodes: Array<{ node: SnapshotNode; parent: SnapshotNode | null }> = [];
  const byLocalId = new Map<string, SnapshotNode>();
  const walk = (node: SnapshotNode, parent: SnapshotNode | null, depth: number) => {
    if (nodes.length >= 250 || depth > 12) throw new TemplateInstantiationError("A estrutura do template excede o limite seguro de 250 itens ou 12 níveis.", 409);
    if (!node || typeof node !== "object" || typeof node.localId !== "string" || !node.localId || !isTemplateSourceType(node.type) || !node.fields || typeof node.fields !== "object" || !Array.isArray(node.children)) throw new TemplateInstantiationError("A estrutura do template é inválida.", 409);
    if (byLocalId.has(node.localId)) throw new TemplateInstantiationError("O template contém identificadores estruturais repetidos.", 409);
    if (parent) {
      if (parent.type === "task") {
        if (node.type !== "task") throw new TemplateInstantiationError("Uma tarefa só pode conter subtarefas.", 409);
        if (nodes.find((entry) => entry.node.localId === parent.localId)?.parent?.type === "task") throw new TemplateInstantiationError("Subtarefas não podem ter subtarefas.", 409);
      } else {
        const hierarchyError = validateAttachment(node.type, node.localId, parent.type, parent.localId);
        if (hierarchyError) throw new TemplateInstantiationError(`Estrutura inválida: ${hierarchyError}`, 409);
      }
    }
    byLocalId.set(node.localId, node); nodes.push({ node, parent });
    for (const child of node.children) walk(child, node, depth + 1);
  };
  walk(snapshot.root, null, 0);
  validateDependencies(snapshot, nodes, byLocalId);
  return { snapshot, nodes, byLocalId };
}

function validateDependencies(snapshot: Snapshot, nodes: Array<{ node: SnapshotNode; parent: SnapshotNode | null }>, byLocalId: Map<string, SnapshotNode>) {
  const parentById = new Map(nodes.map(({ node, parent }) => [node.localId, parent]));
  const adjacency = new Map<string, string[]>();
  for (const edge of snapshot.links.dependencies) {
    const predecessor = byLocalId.get(edge.predecessorLocalId); const successor = byLocalId.get(edge.successorLocalId);
    if (!predecessor || !successor || predecessor.type !== edge.predecessorType || successor.type !== edge.successorType || predecessor.type !== successor.type || predecessor.localId === successor.localId) throw new TemplateInstantiationError("O template contém uma dependência inválida.", 409);
    const predecessorParent = parentById.get(predecessor.localId); const successorParent = parentById.get(successor.localId);
    if (predecessor.type === "phase" && (predecessorParent?.type !== "process" || predecessorParent.localId !== successorParent?.localId)) throw new TemplateInstantiationError("As dependências entre Fases precisam permanecer no mesmo Processo.", 409);
    if (predecessor.type === "task" && (!predecessorParent || predecessorParent.type === "task" || predecessorParent.localId !== successorParent?.localId || predecessorParent.type !== successorParent?.type || (predecessorParent.type !== "process" && predecessorParent.type !== "phase"))) throw new TemplateInstantiationError("As dependências entre tarefas precisam permanecer na mesma Fase ou Processo.", 409);
    adjacency.set(predecessor.localId, [...(adjacency.get(predecessor.localId) ?? []), successor.localId]);
  }
  const visiting = new Set<string>(); const visited = new Set<string>();
  const visit = (id: string) => { if (visiting.has(id)) throw new TemplateInstantiationError("O template contém uma dependência circular.", 409); if (visited.has(id)) return; visiting.add(id); for (const next of adjacency.get(id) ?? []) visit(next); visiting.delete(id); visited.add(id); };
  for (const id of adjacency.keys()) visit(id);
}

export async function loadUsableTemplate(context: Context, templateId: string) {
  const [template] = await context.db.select().from(itemTemplates).where(eq(itemTemplates.id, templateId)).limit(1);
  if (!template) throw new TemplateInstantiationError("Template não encontrado.", 404);
  const visible = template.organizationId ? await canAccessOrganization(context.db, context.user.id, context.user.email, template.organizationId, "view") : template.personalSpaceId === context.space.id;
  if (!visible) throw new TemplateInstantiationError("Você não pode usar este template.", 403);
  return { template, ...parseSnapshot(template.snapshotJson, template.sourceType) };
}

async function resolveParent(context: Context, childType: TemplateSourceType, parentType: HierarchyType | null, parentId: string | null) {
  const hierarchyError = validateAttachment(childType, "nova-instancia", parentType, parentId);
  if (hierarchyError) return { allowed: false, organizationId: null as string | null, name: "", error: hierarchyError };
  if (!parentType && !parentId) return { allowed: true, organizationId: null as string | null, name: "Área pessoal", error: null };
  if (!parentType || !parentId || parentType === "task") return { allowed: false, organizationId: null, name: "", error: "Pai inválido." };
  if (parentType === "organization") { const [item] = await context.db.select().from(organizations).where(eq(organizations.id, parentId)).limit(1); return { allowed: Boolean(item && await canAccessOrganization(context.db, context.user.id, context.user.email, parentId, "add_children")), organizationId: item?.id ?? null, name: item?.name ?? "", error: null }; }
  if (parentType === "department" || parentType === "team") { const table = parentType === "department" ? departments : teams; const [item] = await context.db.select().from(table).where(eq(table.id, parentId)).limit(1); const allowed = Boolean(item && (item.ownerUserId === context.user.id || await canItem(context.db, context.user.id, parentType, parentId, "add_children") || (item.organizationId && await canAccessOrganization(context.db, context.user.id, context.user.email, item.organizationId, "add_children")))); return { allowed, organizationId: item?.organizationId ?? null, name: item?.name ?? "", error: null }; }
  const table = parentType === "project" ? projects : parentType === "front" ? fronts : parentType === "product" ? products : parentType === "process" ? processes : phases;
  const [item] = await context.db.select().from(table).where(eq(table.id, parentId)).limit(1);
  const allowed = item ? parentType === "project" ? await canAccessProject(context.db, context.user.id, parentId, context.space.id, "add_children") : parentType === "front" ? await canAccessFront(context.db, context.user.id, parentId, context.space.id, "add_children") : parentType === "product" ? await canAccessProduct(context.db, context.user.id, parentId, context.space.id, "add_children") : parentType === "process" ? await canAccessProcess(context.db, context.user.id, parentId, context.space.id, "add_children") : await canAccessPhase(context.db, context.user.id, parentId, context.space.id, "add_children") : false;
  return { allowed, organizationId: item?.organizationId ?? null, name: item?.title ?? "", error: null };
}

async function peopleForOrganization(context: Context, organizationId: string | null) {
  if (!organizationId) return [{ id: context.user.id, displayName: context.user.displayName }];
  const [organization] = await context.db.select({ ownerUserId: organizations.ownerUserId }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);
  const members = await context.db.select({ id: users.id, displayName: users.displayName }).from(organizationMembers).innerJoin(users, eq(organizationMembers.userId, users.id)).where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.status, "active"))).orderBy(asc(users.displayName));
  const owner = organization ? await context.db.select({ id: users.id, displayName: users.displayName }).from(users).where(eq(users.id, organization.ownerUserId)).limit(1) : [];
  return [...new Map([{ id: context.user.id, displayName: context.user.displayName }, ...owner, ...members].map((person) => [person.id, person])).values()];
}

export async function listInstantiationTargets(context: Context, rootType: TemplateSourceType) {
  const candidates: Array<{ type: Exclude<HierarchyType, "task">; id: string; name: string }> = [];
  const allowed = allowedParentTypes[rootType];
  if (allowed.includes("organization")) for (const item of await context.db.select().from(organizations).orderBy(asc(organizations.name))) candidates.push({ type: "organization", id: item.id, name: item.name });
  if (allowed.includes("department")) for (const item of await context.db.select().from(departments).orderBy(asc(departments.name))) candidates.push({ type: "department", id: item.id, name: item.name });
  if (allowed.includes("team")) for (const item of await context.db.select().from(teams).orderBy(asc(teams.name))) candidates.push({ type: "team", id: item.id, name: item.name });
  if (allowed.includes("project")) for (const item of await context.db.select().from(projects).orderBy(asc(projects.title))) candidates.push({ type: "project", id: item.id, name: item.title });
  if (allowed.includes("front")) for (const item of await context.db.select().from(fronts).orderBy(asc(fronts.title))) candidates.push({ type: "front", id: item.id, name: item.title });
  if (allowed.includes("product")) for (const item of await context.db.select().from(products).orderBy(asc(products.title))) candidates.push({ type: "product", id: item.id, name: item.title });
  if (allowed.includes("process")) for (const item of await context.db.select().from(processes).orderBy(asc(processes.title))) candidates.push({ type: "process", id: item.id, name: item.title });
  if (allowed.includes("phase")) for (const item of await context.db.select().from(phases).orderBy(asc(phases.title))) candidates.push({ type: "phase", id: item.id, name: item.title });
  const targets: InstantiationTarget[] = [];
  if (rootType !== "front" && rootType !== "phase") targets.push({ type: "personal", id: null, name: "Área pessoal (sem pai)", organizationId: null, people: await peopleForOrganization(context, null) });
  for (const candidate of candidates) { const result = await resolveParent(context, rootType, candidate.type, candidate.id); if (result.allowed) targets.push({ ...candidate, name: `${parentLabels[candidate.type]} · ${candidate.name}`, organizationId: result.organizationId, people: await peopleForOrganization(context, result.organizationId) }); }
  return targets;
}

function datesInFields(fields: Record<string, unknown>) {
  const values = [fields.dueDate, fields.dateAt, fields.startAt, fields.endAt].flatMap((value) => typeof value === "string" && !Number.isNaN(new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value).getTime()) ? [value.slice(0, 10)] : []);
  const recurrence = fields.recurrenceDefinition;
  if (recurrence && typeof recurrence === "object") { const start = (recurrence as { startDate?: unknown }).startDate; if (typeof start === "string" && datePattern.test(start)) values.push(start); }
  return values;
}

export function templateDateAnchor(nodes: Array<{ node: SnapshotNode }>) { return nodes.flatMap(({ node }) => datesInFields(node.fields)).sort()[0] ?? null; }
const addDays = (value: string, days: number) => { const date = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value); date.setUTCDate(date.getUTCDate() + days); return value.length === 10 ? date.toISOString().slice(0, 10) : date.toISOString(); };
function shiftedFields(fields: Record<string, unknown>, deltaDays: number) {
  const next = { ...fields };
  for (const key of ["dueDate", "dateAt", "startAt", "endAt"] as const) if (typeof next[key] === "string") next[key] = addDays(next[key] as string, deltaDays);
  if (next.recurrenceDefinition && typeof next.recurrenceDefinition === "object") { const recurrence = { ...(next.recurrenceDefinition as Record<string, unknown>) }; if (typeof recurrence.startDate === "string") recurrence.startDate = addDays(recurrence.startDate, deltaDays); if (typeof recurrence.endDate === "string") recurrence.endDate = addDays(recurrence.endDate, deltaDays); next.recurrenceDefinition = recurrence; }
  return next;
}

function validateNodeFields(node: SnapshotNode, parent: SnapshotNode | null, fields: Record<string, unknown>, externalParentType: HierarchyType | null) {
  const title = text(fields.title, node.type === "task" ? 160 : 140);
  if (!title) throw new TemplateInstantiationError("Todos os itens do template precisam ter título.", 409);
  if (node.type !== "task") return;
  const taskType = fields.taskType;
  if (!taskTypes.includes(taskType as TaskType) || taskType === "reminder") throw new TemplateInstantiationError("O template contém um tipo de tarefa inválido.", 409);
  if (parent?.type === "task") {
    if (!canHaveSubtasks(parent.fields.taskType as TaskType) || !canBeSubtask(taskType as TaskType)) throw new TemplateInstantiationError("O template contém uma combinação inválida de tarefa e subtarefa.", 409);
  } else {
    const typeError = taskTypeError(taskType as string, (parent?.type ?? externalParentType) as TaskParentType | null); if (typeError) throw new TemplateInstantiationError(typeError, 409);
  }
  const error = commitmentTimeError(taskType as string, fields.startAt as string | null, fields.durationMinutes as number | null) || eventTimeError(taskType as string, fields.startAt as string | null, fields.endAt as string | null) || dateMarkerError(taskType as string, fields.dateAt as string | null);
  if (error) throw new TemplateInstantiationError(error, 409);
  if (typeof fields.dueDate === "string" && !datePattern.test(fields.dueDate)) throw new TemplateInstantiationError("O template contém um prazo inválido.", 409);
  if (recurrenceTaskTypes.includes(taskType as RecurrenceTaskType)) { const parsed = parseRecurrenceDefinition(fields.recurrenceDefinition, taskType as string); if (parsed.error) throw new TemplateInstantiationError(parsed.error, 409); }
}

export async function instantiateTemplate(context: Context, templateId: string, input: { title?: string; parentType?: HierarchyType | "personal" | null; parentId?: string | null; ownerUserId?: string; assigneeIds?: string[]; startDate?: string | null }) {
  const loaded = await loadUsableTemplate(context, templateId);
  const externalType = input.parentType === "personal" || input.parentType === undefined ? null : input.parentType;
  const externalId = externalType ? input.parentId ?? null : null;
  const target = await resolveParent(context, loaded.template.sourceType, externalType, externalId);
  if (!target.allowed) throw new TemplateInstantiationError(target.error ?? "Você não pode criar a instância neste local.", target.error ? 400 : 403);
  const people = await peopleForOrganization(context, target.organizationId); const allowedPeople = new Set(people.map((person) => person.id));
  const ownerUserId = input.ownerUserId || context.user.id; const assigneeIds = [...new Set(input.assigneeIds ?? [])];
  if (!allowedPeople.has(ownerUserId)) throw new TemplateInstantiationError("O Owner inicial precisa pertencer ao destino escolhido.", 403);
  if (assigneeIds.some((id) => !allowedPeople.has(id))) throw new TemplateInstantiationError("Todo responsável precisa pertencer ao destino escolhido.", 403);
  const anchor = templateDateAnchor(loaded.nodes); const requestedStart = input.startDate?.trim() || anchor;
  if (requestedStart && !datePattern.test(requestedStart)) throw new TemplateInstantiationError("Informe uma nova data inicial válida.");
  if (!anchor && input.startDate) throw new TemplateInstantiationError("Este template não possui datas para reposicionar.");
  const deltaDays = anchor && requestedStart ? Math.round((new Date(`${requestedStart}T00:00:00.000Z`).getTime() - new Date(`${anchor}T00:00:00.000Z`).getTime()) / 86400000) : 0;
  const ids = new Map(loaded.nodes.map(({ node }) => [node.localId, crypto.randomUUID()]));
  const normalized = loaded.nodes.map(({ node, parent }) => { const fields = shiftedFields(node.fields, deltaDays); if (!parent && input.title !== undefined) fields.title = text(input.title, node.type === "task" ? 160 : 140); validateNodeFields(node, parent, fields, externalType); return { node, parent, fields, id: ids.get(node.localId)! }; });
  const tagNames = [...new Set(normalized.flatMap(({ node, fields }) => node.type === "task" && Array.isArray(fields.tags) ? fields.tags.map((tag) => text(tag, 40)).filter(Boolean) : []))];
  const existingTags = tagNames.length ? await context.db.select().from(tags).where(eq(tags.personalSpaceId, context.space.id)) : [];
  const tagIds = new Map(existingTags.filter((tag) => tagNames.includes(tag.name)).map((tag) => [tag.name, tag.id]));
  for (const name of tagNames) if (!tagIds.has(name)) tagIds.set(name, crypto.randomUUID());
  const [{ cyclicMax }] = await context.db.select({ cyclicMax: max(tasks.cyclicPosition) }).from(tasks).where(eq(tasks.personalSpaceId, context.space.id));
  type BatchStatement = Parameters<typeof context.db.batch>[0][number]; const statements: BatchStatement[] = [];
  for (const [name, id] of tagIds) if (!existingTags.some((tag) => tag.id === id)) statements.push(context.db.insert(tags).values({ id, personalSpaceId: context.space.id, name }).onConflictDoNothing());
  let cyclicOffset = 0;
  for (const item of normalized) {
    const { node, parent, fields, id } = item; const title = text(fields.title, node.type === "task" ? 160 : 140); const description = text(fields.description, 4000); const parentId = parent ? ids.get(parent.localId)! : externalId; const parentType = parent?.type ?? externalType;
    const common = { id, personalSpaceId: context.space.id, organizationId: target.organizationId, ownerUserId, authorUserId: context.user.id, title, description, approvalRequired: boolean(fields.approvalRequired), size: nullableEnum(fields.size, sizes), importance: nullableEnum(fields.importance, priorities), urgency: nullableEnum(fields.urgency, priorities) };
    if (node.type === "project") statements.push(context.db.insert(projects).values({ ...common, status: "planned" }));
    if (node.type === "front") statements.push(context.db.insert(fronts).values({ ...common, projectId: parentId!, status: "planned" }));
    if (node.type === "product") statements.push(context.db.insert(products).values({ ...common, status: "planned", characteristicsJson: JSON.stringify(Array.isArray(fields.characteristics) ? fields.characteristics : []) }));
    if (node.type === "process") statements.push(context.db.insert(processes).values({ ...common, status: "planned", autoCompleteWhenChildrenDone: boolean(fields.autoCompleteWhenChildrenDone) }));
    if (node.type === "phase") statements.push(context.db.insert(phases).values({ ...common, processId: parentId!, status: "planned", position: Number.isInteger(fields.position) ? Number(fields.position) : 999999 }));
    if (node.type === "task") {
      const taskType = fields.taskType as TaskType; const isSubtask = parent?.type === "task"; const cyclicPosition = taskType === "cyclic" ? (cyclicMax ?? 0) + (++cyclicOffset) : 999999;
      statements.push(context.db.insert(tasks).values({ ...common, taskType, status: "todo", approvalRequired: taskApprovalRequired(taskType, boolean(fields.approvalRequired)), dueDate: typeof fields.dueDate === "string" ? fields.dueDate : null, dateAt: taskType === "date" && typeof fields.dateAt === "string" ? fields.dateAt : null, startAt: (taskType === "commitment" || taskType === "event" || taskType === "scheduled") && typeof fields.startAt === "string" ? fields.startAt : null, endAt: taskType === "event" && typeof fields.endAt === "string" ? fields.endAt : null, durationMinutes: typeof fields.durationMinutes === "number" ? fields.durationMinutes : null, relevance: taskType === "cyclic" && Number.isInteger(fields.relevance) ? Math.min(5, Math.max(1, Number(fields.relevance))) : null, cyclicPosition, cyclicReentryCount: 0, parentTaskId: isSubtask ? parentId : null, subtaskPosition: isSubtask && Number.isInteger(fields.subtaskPosition) ? Number(fields.subtaskPosition) : null }));
      for (const assigneeId of assigneeIds) { statements.push(context.db.insert(taskAssignees).values({ taskId: id, userId: assigneeId })); if (assigneeId !== ownerUserId) statements.push(context.db.insert(itemRoleAssignments).values({ id: crypto.randomUUID(), itemType: "task", itemId: id, userId: assigneeId, role: "executor" }).onConflictDoNothing()); if (assigneeId !== context.user.id) statements.push(context.db.insert(notifications).values({ id: crypto.randomUUID(), recipientUserId: assigneeId, actorUserId: context.user.id, taskId: id, type: "assignment", eventKey: `assignment:${id}:${assigneeId}`, summary: `${context.user.displayName} atribuiu a tarefa “${title}” a você.` })); }
      for (const name of Array.isArray(fields.tags) ? fields.tags.map((tag) => text(tag, 40)).filter(Boolean) : []) statements.push(context.db.insert(taskTags).values({ taskId: id, tagId: tagIds.get(name)! }).onConflictDoNothing());
      for (const entry of Array.isArray(fields.checklist) ? fields.checklist : []) { const checklist = entry && typeof entry === "object" ? entry as Record<string, unknown> : {}; const checklistTitle = text(checklist.title, 240); if (checklistTitle) statements.push(context.db.insert(checklistItems).values({ id: crypto.randomUUID(), taskId: id, title: checklistTitle, completed: false, position: Number.isInteger(checklist.position) ? Number(checklist.position) : 999999 })); }
      if (recurrenceTaskTypes.includes(taskType as RecurrenceTaskType)) { const parsed = parseRecurrenceDefinition(fields.recurrenceDefinition, taskType); const definition = parsed.definition as RecurrenceDefinition; const seriesId = crypto.randomUUID(); const localDate = taskType === "scheduled" && typeof fields.startAt === "string" ? fields.startAt.slice(0, 10) : typeof fields.dueDate === "string" ? fields.dueDate : definition.startDate; const descriptor = recurrenceOccurrenceDescriptor(definition, taskType as RecurrenceTaskType, localDate, taskType === "scheduled" ? fields.startAt as string : null); statements.push(context.db.insert(recurrenceSeries).values({ id: seriesId, personalSpaceId: context.space.id, organizationId: target.organizationId, ownerUserId, authorUserId: context.user.id, title, description, taskType: taskType as RecurrenceTaskType, parentType: parentType as TaskParentType | null, parentId, definitionJson: JSON.stringify(definition), active: true })); statements.push(context.db.insert(recurrenceOccurrences).values({ id: crypto.randomUUID(), seriesId, taskId: id, logicalKey: descriptor.logicalKey, scheduledAt: descriptor.scheduledAt, periodKey: descriptor.periodKey })); }
    }
    if (!(node.type === "task" && parent?.type === "task")) statements.push(context.db.insert(hierarchyAttachments).values({ id: crypto.randomUUID(), childType: node.type, childId: id, parentType: parentType as Exclude<HierarchyType, "task"> | null, parentId }));
    statements.push(context.db.insert(itemRoleAssignments).values({ id: crypto.randomUUID(), itemType: node.type, itemId: id, userId: ownerUserId, role: "owner" }));
  }
  for (const edge of loaded.snapshot.links.dependencies) statements.push(context.db.insert(dependencyEdges).values({ id: crypto.randomUUID(), predecessorType: edge.predecessorType, predecessorId: ids.get(edge.predecessorLocalId)!, successorType: edge.successorType, successorId: ids.get(edge.successorLocalId)! }));
  const rootId = ids.get(loaded.snapshot.root.localId)!; const rootTitle = text(normalized[0].fields.title, loaded.template.sourceType === "task" ? 160 : 140); const action = loaded.template.sourceType === "task" ? "task_created" : `${loaded.template.sourceType}_created` as "project_created" | "front_created" | "product_created" | "process_created" | "phase_created";
  statements.push(context.db.insert(auditEvents).values({ id: crypto.randomUUID(), organizationId: target.organizationId, personalSpaceId: target.organizationId ? null : context.space.id, actorUserId: context.user.id, actorName: context.user.displayName, action, subjectType: loaded.template.sourceType, subjectId: rootId, summary: `instanciou “${rootTitle}” a partir do template “${loaded.template.name}”.` }));
  if (!statements.length) throw new TemplateInstantiationError("O template não possui itens para instanciar.", 409);
  await context.db.batch(statements as [BatchStatement, ...BatchStatement[]]);
  return { rootId, rootType: loaded.template.sourceType, title: rootTitle, nodeCount: loaded.nodes.length, dependencyLinkCount: loaded.snapshot.links.dependencies.length, parentName: target.name };
}
