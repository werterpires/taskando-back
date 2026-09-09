import { and, eq } from "drizzle-orm";
import { canAccessPhase, canAccessProcess, canAccessTask } from "./authorization";
import { dependencyEdges, hierarchyAttachments, phases, tasks } from "./schema";
import { isDateMarkerReleased, isEventReleased } from "./task-types";

export const dependencyNodeTypes = ["task", "phase"] as const;
export type DependencyNodeType = typeof dependencyNodeTypes[number];
type Context = NonNullable<Awaited<ReturnType<typeof import("./current-user").ensurePersonalContext>>>;

export type DependencyNode = {
  type: DependencyNodeType;
  id: string;
  title: string;
  status: string;
  released: boolean;
  taskType?: string;
  approvalRequired?: boolean;
  position?: number;
  containerType: "process" | "phase";
  containerId: string;
  processId: string;
};

async function taskNode(context: Context, id: string, capability: "view" | "interact") {
  const [task] = await context.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!task || task.parentTaskId || !(await canAccessTask(context.db, context.user.id, id, context.space.id, capability))) return null;
  const [attachment] = await context.db.select().from(hierarchyAttachments).where(and(eq(hierarchyAttachments.childType, "task"), eq(hierarchyAttachments.childId, id))).limit(1);
  if (!attachment || !attachment.parentId || (attachment.parentType !== "process" && attachment.parentType !== "phase")) return null;
  const released = task.status === "completed" || (task.taskType === "date" && isDateMarkerReleased(task.dateAt)) || (task.taskType === "event" && isEventReleased(task.endAt));
  if (attachment.parentType === "process") return { type: "task" as const, id, title: task.title, status: task.status, released, taskType: task.taskType, approvalRequired: task.approvalRequired, containerType: "process" as const, containerId: attachment.parentId, processId: attachment.parentId };
  const [phase] = await context.db.select({ processId: phases.processId }).from(phases).where(eq(phases.id, attachment.parentId)).limit(1);
  if (!phase) return null;
  return { type: "task" as const, id, title: task.title, status: task.status, released, taskType: task.taskType, approvalRequired: task.approvalRequired, containerType: "phase" as const, containerId: attachment.parentId, processId: phase.processId };
}

async function phaseNode(context: Context, id: string, capability: "view" | "interact") {
  const [phase] = await context.db.select().from(phases).where(eq(phases.id, id)).limit(1);
  if (!phase || !(await canAccessPhase(context.db, context.user.id, id, context.space.id, capability))) return null;
  return { type: "phase" as const, id, title: phase.title, status: phase.status, released: phase.status === "completed", approvalRequired: phase.approvalRequired, position: phase.position, containerType: "process" as const, containerId: phase.processId, processId: phase.processId };
}

export async function dependencyNode(context: Context, type: DependencyNodeType, id: string, capability: "view" | "interact" = "view"): Promise<DependencyNode | null> {
  return type === "task" ? taskNode(context, id, capability) : phaseNode(context, id, capability);
}

export async function validateDependencyEdge(context: Context, predecessorType: DependencyNodeType, predecessorId: string, successorType: DependencyNodeType, successorId: string) {
  const [predecessor, successor] = await Promise.all([
    dependencyNode(context, predecessorType, predecessorId, "interact"),
    dependencyNode(context, successorType, successorId, "interact"),
  ]);
  if (!predecessor || !successor) return { error: "Você só pode vincular tarefas ou Fases às quais tem permissão de interagir." };
  if (predecessor.type !== successor.type) return { error: "Dependências não podem cruzar Fases e tarefas." };
  if (predecessor.type === "phase" && predecessor.processId !== successor.processId) return { error: "Fases só podem depender de outras Fases do mesmo Processo." };
  if (predecessor.type === "task" && (predecessor.containerType !== successor.containerType || predecessor.containerId !== successor.containerId)) return { error: "Tarefas só podem depender de tarefas diretas da mesma Fase ou do mesmo Processo." };
  if (predecessorId === successorId) return { error: "Um item não pode depender dele mesmo." };
  const existingEdges = await context.db.select({ predecessorId: dependencyEdges.predecessorId, successorId: dependencyEdges.successorId }).from(dependencyEdges).where(and(eq(dependencyEdges.predecessorType, predecessor.type), eq(dependencyEdges.successorType, predecessor.type)));
  const successorsByPredecessor = new Map<string, string[]>();
  for (const edge of existingEdges) successorsByPredecessor.set(edge.predecessorId, [...(successorsByPredecessor.get(edge.predecessorId) ?? []), edge.successorId]);
  const pending = [successorId]; const visited = new Set<string>(); const previous = new Map<string, string>();
  while (pending.length) {
    const current = pending.pop()!;
    if (current === predecessorId) {
      const path = [current]; let cursor = current;
      while (previous.has(cursor)) { cursor = previous.get(cursor)!; path.push(cursor); }
      path.reverse();
      return { error: `Essa ligação criaria uma dependência circular. Caminho que fecharia o ciclo: ${[predecessor.title, successor.title, ...path.slice(1, -1), predecessor.title].join(" → ")}.` };
    }
    if (visited.has(current)) continue;
    visited.add(current);
    for (const next of successorsByPredecessor.get(current) ?? []) { if (!visited.has(next)) previous.set(next, current); pending.push(next); }
  }
  return { predecessor, successor };
}

export async function dependencyContainer(context: Context, containerType: "process" | "phase", containerId: string) {
  if (containerType === "process") {
    if (!(await canAccessProcess(context.db, context.user.id, containerId, context.space.id, "view_children"))) return null;
    const phaseRows = await context.db.select().from(phases).where(eq(phases.processId, containerId));
    const phaseNodes = (await Promise.all(phaseRows.map((phase) => dependencyNode(context, "phase", phase.id)))).filter((node): node is DependencyNode => node !== null);
    const attachments = await context.db.select({ childId: hierarchyAttachments.childId }).from(hierarchyAttachments).where(and(eq(hierarchyAttachments.childType, "task"), eq(hierarchyAttachments.parentType, "process"), eq(hierarchyAttachments.parentId, containerId)));
    const taskNodes = (await Promise.all(attachments.map((attachment) => dependencyNode(context, "task", attachment.childId)))).filter((node): node is DependencyNode => node !== null);
    return { taskNodes, phaseNodes };
  }
  const [phase] = await context.db.select({ processId: phases.processId }).from(phases).where(eq(phases.id, containerId)).limit(1);
  if (!phase || !(await canAccessPhase(context.db, context.user.id, containerId, context.space.id, "view_children"))) return null;
  const attachments = await context.db.select({ childId: hierarchyAttachments.childId }).from(hierarchyAttachments).where(and(eq(hierarchyAttachments.childType, "task"), eq(hierarchyAttachments.parentType, "phase"), eq(hierarchyAttachments.parentId, containerId)));
  const taskNodes = (await Promise.all(attachments.map((attachment) => dependencyNode(context, "task", attachment.childId)))).filter((node): node is DependencyNode => node !== null);
  return { taskNodes, phaseNodes: [] as DependencyNode[] };
}

export async function edgesForNodes(context: Context, nodes: DependencyNode[]) {
  if (!nodes.length) return [];
  const valid = new Set(nodes.map((node) => `${node.type}:${node.id}`));
  const rows = await context.db.select().from(dependencyEdges);
  return rows.filter((edge) => valid.has(`${edge.predecessorType}:${edge.predecessorId}`) && valid.has(`${edge.successorType}:${edge.successorId}`));
}
