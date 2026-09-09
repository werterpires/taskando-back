import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { canAccessFront, canAccessPhase, canAccessProcess, canAccessProduct, canAccessProject, canAccessTask } from "./authorization";
import { ensurePersonalContext } from "./current-user";
import { type TemplateSourceType } from "./item-templates";
import { checklistItems, dependencyEdges, fronts, hierarchyAttachments, phases, processes, products, projects, recurrenceOccurrences, recurrenceSeries, tags, taskTags, tasks } from "./schema";

type PersonalContext = NonNullable<Awaited<ReturnType<typeof ensurePersonalContext>>>;

type InternalSnapshotNode = {
  localId: string;
  sourceType: TemplateSourceType;
  sourceId: string;
  title: string;
  organizationId: string | null;
  fields: Record<string, unknown>;
  children: InternalSnapshotNode[];
};

export type TemplateSnapshotNode = {
  localId: string;
  type: TemplateSourceType;
  fields: Record<string, unknown>;
  children: TemplateSnapshotNode[];
};

export type TemplateSnapshot = {
  schemaVersion: 2;
  capturedAt: string;
  root: TemplateSnapshotNode;
  links: {
    dependencies: Array<{
      predecessorType: "task" | "phase";
      predecessorLocalId: string;
      successorType: "task" | "phase";
      successorLocalId: string;
    }>;
  };
  stats: { nodeCount: number; hierarchyLinkCount: number; dependencyLinkCount: number };
};

export class TemplateSnapshotError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

const isWorkType = (value: string): value is TemplateSourceType => ["project", "front", "product", "process", "phase", "task"].includes(value);
const safeJson = (value: string, fallback: unknown) => { try { return JSON.parse(value) as unknown; } catch { return fallback; } };
const keyOf = (type: TemplateSourceType, id: string) => `${type}:${id}`;

async function canView(context: PersonalContext, type: TemplateSourceType, id: string) {
  const check = type === "project" ? canAccessProject
    : type === "front" ? canAccessFront
      : type === "product" ? canAccessProduct
        : type === "process" ? canAccessProcess
          : type === "phase" ? canAccessPhase
            : canAccessTask;
  return check(context.db, context.user.id, id, context.space.id, "view");
}

async function taskFields(context: PersonalContext, task: typeof tasks.$inferSelect) {
  const [checklist, tagRows, occurrence] = await Promise.all([
    context.db.select({ title: checklistItems.title, position: checklistItems.position }).from(checklistItems).where(eq(checklistItems.taskId, task.id)).orderBy(asc(checklistItems.position), asc(checklistItems.createdAt)),
    context.db.select({ name: tags.name }).from(taskTags).innerJoin(tags, eq(taskTags.tagId, tags.id)).where(eq(taskTags.taskId, task.id)).orderBy(asc(tags.name)),
    context.db.select({ seriesId: recurrenceOccurrences.seriesId }).from(recurrenceOccurrences).where(eq(recurrenceOccurrences.taskId, task.id)).limit(1),
  ]);
  let recurrenceDefinition: unknown = null;
  if (occurrence[0]) {
    const [series] = await context.db.select({ definitionJson: recurrenceSeries.definitionJson }).from(recurrenceSeries).where(eq(recurrenceSeries.id, occurrence[0].seriesId)).limit(1);
    if (series) recurrenceDefinition = safeJson(series.definitionJson, null);
  }
  return {
    title: task.title,
    description: task.description,
    taskType: task.taskType,
    status: "todo",
    size: task.size,
    importance: task.importance,
    urgency: task.urgency,
    relevance: task.relevance,
    approvalRequired: task.approvalRequired,
    dueDate: task.dueDate,
    dateAt: task.dateAt,
    startAt: task.startAt,
    endAt: task.endAt,
    durationMinutes: task.durationMinutes,
    recurrenceDefinition,
    tags: tagRows.map((row) => row.name),
    checklist: checklist.map((item) => ({ title: item.title, completed: false, position: item.position })),
    subtaskPosition: task.subtaskPosition,
  };
}

async function loadNode(context: PersonalContext, type: TemplateSourceType, id: string, localId: string): Promise<InternalSnapshotNode> {
  if (!(await canView(context, type, id))) throw new TemplateSnapshotError("Você não tem acesso a toda a estrutura necessária para criar este template.", 403);
  if (type === "project") {
    const [item] = await context.db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!item) throw new TemplateSnapshotError("Item de origem não encontrado.", 404);
    return { localId, sourceType: type, sourceId: id, title: item.title, organizationId: item.organizationId, fields: { title: item.title, description: item.description, status: "planned", approvalRequired: item.approvalRequired, size: item.size, importance: item.importance, urgency: item.urgency }, children: [] };
  }
  if (type === "front") {
    const [item] = await context.db.select().from(fronts).where(eq(fronts.id, id)).limit(1);
    if (!item) throw new TemplateSnapshotError("Item de origem não encontrado.", 404);
    return { localId, sourceType: type, sourceId: id, title: item.title, organizationId: item.organizationId, fields: { title: item.title, description: item.description, status: "planned", approvalRequired: item.approvalRequired, size: item.size, importance: item.importance, urgency: item.urgency }, children: [] };
  }
  if (type === "product") {
    const [item] = await context.db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!item) throw new TemplateSnapshotError("Item de origem não encontrado.", 404);
    return { localId, sourceType: type, sourceId: id, title: item.title, organizationId: item.organizationId, fields: { title: item.title, description: item.description, status: "planned", approvalRequired: item.approvalRequired, characteristics: safeJson(item.characteristicsJson, []), size: item.size, importance: item.importance, urgency: item.urgency }, children: [] };
  }
  if (type === "process") {
    const [item] = await context.db.select().from(processes).where(eq(processes.id, id)).limit(1);
    if (!item) throw new TemplateSnapshotError("Item de origem não encontrado.", 404);
    return { localId, sourceType: type, sourceId: id, title: item.title, organizationId: item.organizationId, fields: { title: item.title, description: item.description, status: "planned", approvalRequired: item.approvalRequired, autoCompleteWhenChildrenDone: item.autoCompleteWhenChildrenDone, size: item.size, importance: item.importance, urgency: item.urgency }, children: [] };
  }
  if (type === "phase") {
    const [item] = await context.db.select().from(phases).where(eq(phases.id, id)).limit(1);
    if (!item) throw new TemplateSnapshotError("Item de origem não encontrado.", 404);
    return { localId, sourceType: type, sourceId: id, title: item.title, organizationId: item.organizationId, fields: { title: item.title, description: item.description, status: "planned", approvalRequired: item.approvalRequired, position: item.position, size: item.size, importance: item.importance, urgency: item.urgency }, children: [] };
  }
  const [item] = await context.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!item) throw new TemplateSnapshotError("Item de origem não encontrado.", 404);
  return { localId, sourceType: type, sourceId: id, title: item.title, organizationId: item.organizationId, fields: await taskFields(context, item), children: [] };
}

async function childReferences(context: PersonalContext, node: InternalSnapshotNode) {
  const attached = node.sourceType === "task" ? [] : await context.db.select({ childType: hierarchyAttachments.childType, childId: hierarchyAttachments.childId })
    .from(hierarchyAttachments)
    .where(and(eq(hierarchyAttachments.parentType, node.sourceType), eq(hierarchyAttachments.parentId, node.sourceId)))
    .orderBy(asc(hierarchyAttachments.childType), asc(hierarchyAttachments.childId));
  const subtasks = node.sourceType === "task" ? await context.db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.parentTaskId, node.sourceId), isNull(tasks.deletedAt))).orderBy(asc(tasks.subtaskPosition), asc(tasks.createdAt)) : [];
  return [
    ...attached.filter((item): item is { childType: TemplateSourceType; childId: string } => isWorkType(item.childType)),
    ...subtasks.map((item) => ({ childType: "task" as const, childId: item.id })),
  ];
}

const publicNode = (node: InternalSnapshotNode): TemplateSnapshotNode => ({ localId: node.localId, type: node.sourceType, fields: node.fields, children: node.children.map(publicNode) });

export async function captureTemplateSnapshot(context: PersonalContext, sourceType: TemplateSourceType, sourceId: string) {
  let sequence = 0;
  const nodes = new Map<string, InternalSnapshotNode>();
  const visit = async (type: TemplateSourceType, id: string, ancestry: Set<string>): Promise<InternalSnapshotNode> => {
    const sourceKey = keyOf(type, id);
    if (ancestry.has(sourceKey)) throw new TemplateSnapshotError("A estrutura contém um ciclo e não pode ser salva como template.", 409);
    const existing = nodes.get(sourceKey);
    if (existing) return existing;
    const node = await loadNode(context, type, id, `node-${++sequence}`);
    nodes.set(sourceKey, node);
    const nextAncestry = new Set(ancestry).add(sourceKey);
    for (const child of await childReferences(context, node)) node.children.push(await visit(child.childType, child.childId, nextAncestry));
    return node;
  };

  const root = await visit(sourceType, sourceId, new Set());
  const graphNodes = [...nodes.values()].filter((node) => node.sourceType === "task" || node.sourceType === "phase");
  const graphIds = new Set(graphNodes.map((node) => node.sourceId));
  const capturedEdges: typeof dependencyEdges.$inferSelect[] = [];
  for (let offset = 0; offset < graphNodes.length; offset += 200) {
    const predecessorIds = graphNodes.slice(offset, offset + 200).map((node) => node.sourceId);
    if (predecessorIds.length) capturedEdges.push(...await context.db.select().from(dependencyEdges).where(inArray(dependencyEdges.predecessorId, predecessorIds)));
  }
  const dependencies = capturedEdges.flatMap((edge) => {
    if (!graphIds.has(edge.successorId)) return [];
    const predecessor = nodes.get(keyOf(edge.predecessorType, edge.predecessorId));
    const successor = nodes.get(keyOf(edge.successorType, edge.successorId));
    return predecessor && successor ? [{ predecessorType: edge.predecessorType, predecessorLocalId: predecessor.localId, successorType: edge.successorType, successorLocalId: successor.localId }] : [];
  });
  const snapshot: TemplateSnapshot = {
    schemaVersion: 2,
    capturedAt: new Date().toISOString(),
    root: publicNode(root),
    links: { dependencies },
    stats: { nodeCount: nodes.size, hierarchyLinkCount: Math.max(0, nodes.size - 1), dependencyLinkCount: dependencies.length },
  };
  return { title: root.title, organizationId: root.organizationId, snapshot };
}
