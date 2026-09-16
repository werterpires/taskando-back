import { and, eq, inArray, or } from "drizzle-orm";
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
  canConnect: boolean;
};

export type DependencyGraphNode = DependencyNode & {
  dependencyState: "independent" | "blocked" | "released";
  dependencyBlockers: { type: DependencyNodeType; id: string; title: string }[];
};

export type DependencyGraphEdge = typeof dependencyEdges.$inferSelect & { canRemove: boolean };

async function taskNode(context: Context, id: string, capability: "view" | "interact") {
  const [task] = await context.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!task || task.parentTaskId || !(await canAccessTask(context.db, context.user.id, id, context.space.id, capability))) return null;
  const [attachment] = await context.db.select().from(hierarchyAttachments).where(and(eq(hierarchyAttachments.childType, "task"), eq(hierarchyAttachments.childId, id))).limit(1);
  if (!attachment || !attachment.parentId || (attachment.parentType !== "process" && attachment.parentType !== "phase")) return null;
  const released = task.status === "completed" || task.status === "cancelled" || (task.status !== "archived" && ((task.taskType === "date" && isDateMarkerReleased(task.dateAt)) || (task.taskType === "event" && isEventReleased(task.endAt))));
  const canConnect = capability === "interact" || await canAccessTask(context.db, context.user.id, id, context.space.id, "interact");
  if (attachment.parentType === "process") return { type: "task" as const, id, title: task.title, status: task.status, released, taskType: task.taskType, approvalRequired: task.approvalRequired, containerType: "process" as const, containerId: attachment.parentId, processId: attachment.parentId, canConnect };
  const [phase] = await context.db.select({ processId: phases.processId }).from(phases).where(eq(phases.id, attachment.parentId)).limit(1);
  if (!phase) return null;
  return { type: "task" as const, id, title: task.title, status: task.status, released, taskType: task.taskType, approvalRequired: task.approvalRequired, containerType: "phase" as const, containerId: attachment.parentId, processId: phase.processId, canConnect };
}

async function phaseNode(context: Context, id: string, capability: "view" | "interact") {
  const [phase] = await context.db.select().from(phases).where(eq(phases.id, id)).limit(1);
  if (!phase || !(await canAccessPhase(context.db, context.user.id, id, context.space.id, capability))) return null;
  const canConnect = capability === "interact" || await canAccessPhase(context.db, context.user.id, id, context.space.id, "interact");
  return { type: "phase" as const, id, title: phase.title, status: phase.status, released: phase.status === "completed" || phase.status === "cancelled", approvalRequired: phase.approvalRequired, position: phase.position, containerType: "process" as const, containerId: phase.processId, processId: phase.processId, canConnect };
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
  const scopeIds = predecessor.type === "phase"
    ? (await context.db.select({ id: phases.id }).from(phases).where(eq(phases.processId, predecessor.processId))).map((row) => row.id)
    : (await context.db.select({ id: hierarchyAttachments.childId }).from(hierarchyAttachments).where(and(eq(hierarchyAttachments.childType, "task"), eq(hierarchyAttachments.parentType, predecessor.containerType), eq(hierarchyAttachments.parentId, predecessor.containerId)))).map((row) => row.id);
  const existingEdges = await context.db.select({ predecessorId: dependencyEdges.predecessorId, successorId: dependencyEdges.successorId }).from(dependencyEdges).where(and(eq(dependencyEdges.predecessorType, predecessor.type), eq(dependencyEdges.successorType, predecessor.type), inArray(dependencyEdges.predecessorId, scopeIds), inArray(dependencyEdges.successorId, scopeIds)));
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
  const taskIds = nodes.filter((node) => node.type === "task").map((node) => node.id);
  const phaseIds = nodes.filter((node) => node.type === "phase").map((node) => node.id);
  const taskScope = taskIds.length ? and(eq(dependencyEdges.predecessorType, "task"), eq(dependencyEdges.successorType, "task"), inArray(dependencyEdges.predecessorId, taskIds), inArray(dependencyEdges.successorId, taskIds)) : undefined;
  const phaseScope = phaseIds.length ? and(eq(dependencyEdges.predecessorType, "phase"), eq(dependencyEdges.successorType, "phase"), inArray(dependencyEdges.predecessorId, phaseIds), inArray(dependencyEdges.successorId, phaseIds)) : undefined;
  return context.db.select().from(dependencyEdges).where(or(taskScope, phaseScope));
}

/** Adds derived state and exact mutation capabilities without exposing hidden nodes. */
export function enrichDependencyGraph(nodes: DependencyNode[], edges: (typeof dependencyEdges.$inferSelect)[]) {
  const byKey = new Map(nodes.map((node) => [`${node.type}:${node.id}`, node]));
  const enrichedNodes: DependencyGraphNode[] = nodes.map((node) => {
    const incoming = edges.filter((edge) => edge.successorType === node.type && edge.successorId === node.id);
    const dependencyBlockers = incoming
      .map((edge) => byKey.get(`${edge.predecessorType}:${edge.predecessorId}`))
      .filter((predecessor): predecessor is DependencyNode => Boolean(predecessor) && !predecessor!.released)
      .map((predecessor) => ({ type: predecessor.type, id: predecessor.id, title: predecessor.title }));
    const dependencyState = dependencyBlockers.length ? "blocked" as const : incoming.length ? "released" as const : "independent" as const;
    return { ...node, dependencyState, dependencyBlockers };
  });
  const enrichedEdges: DependencyGraphEdge[] = edges.map((edge) => ({
    ...edge,
    canRemove: Boolean(byKey.get(`${edge.predecessorType}:${edge.predecessorId}`)?.canConnect && byKey.get(`${edge.successorType}:${edge.successorId}`)?.canConnect),
  }));
  return { nodes: enrichedNodes, edges: enrichedEdges };
}
