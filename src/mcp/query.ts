import { and, asc, eq, gt, inArray, isNull, like, or } from "drizzle-orm";
import { ensurePersonalContext, type PersonalContext } from "../db/current-user";
import * as auth from "../db/authorization";
import { departments, organizations, teams, projects, fronts, products, processes, phases, tasks, hierarchyAttachments, dependencyEdges } from "../db/schema";
import { dependencyDisplayForTasks } from "../db/dependency-release";
import { getEffectiveCyclicQueueState } from "../db/cyclic";
import { taskParents } from "../db/task-types";
import { resolveTaskParent } from "../app/api/tasks/shared";
export const itemTypes = ["organization", "department", "team", "project", "front", "product", "process", "phase", "task"] as const;
export type ItemType = typeof itemTypes[number];
type HierarchyParentType = Exclude<ItemType, "task">;
const tables = { organization: organizations, department: departments, team: teams, project: projects, front: fronts, product: products, process: processes, phase: phases, task: tasks };
export async function allowedInContext(c: PersonalContext, type: ItemType, id: string, capability: "view" = "view") {
  if (type === "organization") return auth.canAccessOrganization(c.db, c.user.id, c.user.email, id, capability);
  if (type === "department" || type === "team") return (await resolveTaskParent(c, type, id, capability)).allowed;
  const check = { task: auth.canAccessTask, project: auth.canAccessProject, front: auth.canAccessFront, product: auth.canAccessProduct, process: auth.canAccessProcess, phase: auth.canAccessPhase }[type];
  return check(c.db, c.user.id, id, c.space.id, capability);
}
export async function allowed(type: ItemType, id: string, capability: "view" = "view") {
  const c = (await ensurePersonalContext())!;
  return allowedInContext(c, type, id, capability);
}
export async function getItem(type: ItemType, id: string) {
  const c = (await ensurePersonalContext())!;
  if (!itemTypes.includes(type) || !await allowed(type, id)) throw new Error("Item não encontrado ou sem acesso.");
  if (type === "task") await getEffectiveCyclicQueueState(c.db, c.space.id);
  const table = tables[type];
  const [item] = await c.db.select().from(table).where(eq(table.id, id)).limit(1);
  const [parent] = type === "organization" ? [] : await c.db.select().from(hierarchyAttachments).where(and(eq(hierarchyAttachments.childType, type), eq(hierarchyAttachments.childId, id))).limit(1);
  const visibleParent = parent?.parentType && parent.parentId && await allowed(parent.parentType as ItemType, parent.parentId) ? parent : null;
  return { ...item, type, parentType: visibleParent?.parentType ?? null, parentId: visibleParent?.parentId ?? null };
}
export async function searchItems(args: Record<string, unknown>) {
  const c = (await ensurePersonalContext())!;
  const type = args.type as ItemType;
  if (!itemTypes.includes(type)) throw new Error("Tipo inválido.");
  const table = tables[type];
  const title = "title" in table ? table.title : table.name;
  const limit = Math.min(100, Math.max(1, Number(args.limit) || 30));
  const conditions = [args.cursor ? gt(table.id, String(args.cursor)) : undefined, args.query ? like(title, `%${String(args.query).replace(/[\\%_]/g, "")}%`) : undefined, type === "task" ? isNull(tasks.deletedAt) : undefined];
  const candidates = await c.db.select().from(table).where(and(...conditions)).orderBy(asc(table.id)).limit(26);
  const result = []; let consumed: string | null = null;
  for (const row of candidates.slice(0,25)) {
    consumed = row.id;
    if (await allowed(type, row.id)) result.push(await getItem(type, row.id));
    if (result.length >= limit) break;
  }
  return { items: result, nextCursor: consumed && (candidates.length > 25 || candidates.findIndex(r=>r.id===consumed) < candidates.length-1) ? consumed : null };
}
export async function taskReadiness(task: typeof tasks.$inferSelect) {
  const c = (await ensurePersonalContext())!;
  const display = (await dependencyDisplayForTasks(c, [task.id])).get(task.id)!;
  const blockers: { type: string; id?: string; title: string }[] = [];
  for (const blocker of display.blockers) blockers.push(await allowed("task", blocker.id) ? { type: "task", ...blocker } : { type: "restricted", title: "Predecessora sem acesso" });
  let childType: ItemType = "task", childId = task.parentTaskId ?? task.id;
  const ancestry: { type: ItemType; id: string }[] = [];
  if (task.parentTaskId) ancestry.push({ type: "task", id: task.parentTaskId });
  const seen = new Set<string>();
  for (let depth=0; depth<20; depth++) {
    const key = `${childType}:${childId}`; if(seen.has(key)) break; seen.add(key);
    if(childType === "organization") break;
    const [link] = await c.db.select().from(hierarchyAttachments).where(and(eq(hierarchyAttachments.childType, childType), eq(hierarchyAttachments.childId, childId))).limit(1);
    if (!link?.parentType || !link.parentId) break;
    childType = link.parentType as ItemType; childId = link.parentId;
    ancestry.push({ type: childType, id: childId });
    if(childType === "phase") {
      const edges = await c.db.select().from(dependencyEdges).where(and(eq(dependencyEdges.successorType,"phase"),eq(dependencyEdges.successorId,childId)));
      for(const edge of edges) {
        const [phase] = await c.db.select().from(phases).where(eq(phases.id,edge.predecessorId)).limit(1);
        if(phase && !["completed","cancelled"].includes(phase.status)) blockers.push(await allowed("phase",phase.id) ? { type:"phase",id:phase.id,title:phase.title } : {type:"restricted",title:"Fase predecessora sem acesso"});
      }
    }
    if(["phase","process","project","task"].includes(childType)) {
      const table = tables[childType]; const [parent] = await c.db.select().from(table).where(eq(table.id,childId)).limit(1);
      if(parent && "status" in parent && ["completed","cancelled","archived","awaiting_approval"].includes(parent.status)) blockers.push({type:"container",title:"Contêiner encerrado ou aguardando aprovação"});
    }
  }
  if(task.taskType==="cyclic" && (task.relevance??3)!==(await getEffectiveCyclicQueueState(c.db,c.space.id)).releasedLevel) blockers.push({type:"cyclic",title:"Nível cíclico ainda não liberado"});
  if(task.startAt && new Date(task.startAt)>new Date()) blockers.push({type:"schedule",title:"Início agendado ainda não chegou"});
  const canExecute = await auth.canAccessTask(c.db,c.user.id,task.id,c.space.id,"interact");
  return { blockers, ancestry, canExecute, ready: canExecute && blockers.length===0 && ["planned","todo","in_progress"].includes(task.status) && task.taskType!=="date" };
}
export async function nextTasks(args: Record<string, unknown>) {
  const c = (await ensurePersonalContext())!;
  if(args.projectId && !await allowed("project",String(args.projectId))) throw new Error("Projeto não encontrado ou sem acesso.");
  await getEffectiveCyclicQueueState(c.db, c.space.id);
  const candidates: (typeof tasks.$inferSelect)[] = await c.db.select().from(tasks).where(and(isNull(tasks.deletedAt),or(eq(tasks.status,"planned"),eq(tasks.status,"todo"),eq(tasks.status,"in_progress")),args.cursor?gt(tasks.id,String(args.cursor)):undefined)).orderBy(asc(tasks.id)).limit(26);
  const items = []; const today = typeof args.today === "string" ? args.today : new Date().toISOString().slice(0,10);
  for(const task of candidates.slice(0,25)) {
    if(!await allowed("task",task.id)) continue;
    const state = await taskReadiness(task);
    if(args.projectId && !state.ancestry.some(a=>a.type==="project"&&a.id===args.projectId)) continue;
    if(args.readyOnly !== false && !state.ready) continue;
    if(args.dueBefore && (!task.dueDate || task.dueDate>String(args.dueBefore))) continue;
    const ancestry = []; for(const a of state.ancestry) if(await allowed(a.type,a.id)) ancestry.push(a);
    items.push({...task,...state,ancestry,overdue:Boolean(task.dueDate && task.dueDate<today),nextStatus:task.status==="planned"?"todo":"in_progress"});
  }
  const weight:Record<string,number>={high:3,medium:2,low:1};
  items.sort((a,b)=>(a.dueDate??"9999").localeCompare(b.dueDate??"9999")||(weight[b.urgency??""]??0)-(weight[a.urgency??""]??0)||(weight[b.importance??""]??0)-(weight[a.importance??""]??0)||a.id.localeCompare(b.id));
  return {tasks:items,nextCursor:candidates.length>25?candidates[24].id:null,today,ordering:"Prazo crescente, urgência, importância. Leia todas as páginas para comparar o projeto inteiro.",scanned:Math.min(candidates.length,25)};
}

const openTaskStatuses = ["planned", "todo", "in_progress", "awaiting_approval"] as const;

async function descendantTaskIds(context: PersonalContext, rootType: ItemType, rootId: string) {
  const taskIds = new Set<string>();
  const visited = new Set<string>();
  let frontier: { type: ItemType; id: string }[] = [{ type: rootType, id: rootId }];

  while (frontier.length) {
    const current = frontier.filter((node) => {
      const key = `${node.type}:${node.id}`;
      if (visited.has(key)) return false;
      visited.add(key);
      if (node.type === "task") taskIds.add(node.id);
      return true;
    });
    if (!current.length) break;

    const containersByType = new Map<HierarchyParentType, string[]>();
    for (const node of current) {
      if (node.type === "task") continue;
      const type = node.type as HierarchyParentType;
      containersByType.set(type, [...(containersByType.get(type) ?? []), node.id]);
    }
    const attachmentConditions = [...containersByType].map(([type, ids]) => and(eq(hierarchyAttachments.parentType, type), inArray(hierarchyAttachments.parentId, ids)));
    const taskParentIds = current.filter((node) => node.type === "task").map((node) => node.id);
    const [attachedChildren, subtasks] = await Promise.all([
      attachmentConditions.length ? context.db.select({ type: hierarchyAttachments.childType, id: hierarchyAttachments.childId }).from(hierarchyAttachments).where(or(...attachmentConditions)) : Promise.resolve([]),
      taskParentIds.length ? context.db.select({ id: tasks.id }).from(tasks).where(inArray(tasks.parentTaskId, taskParentIds)) : Promise.resolve([]),
    ]);
    frontier = [
      ...attachedChildren.map((child) => ({ type: child.type as ItemType, id: child.id })),
      ...subtasks.map((task) => ({ type: "task" as const, id: task.id })),
    ];
  }

  return [...taskIds];
}

async function visibleTasksAtEarliestDate(context: PersonalContext, candidates: (typeof tasks.$inferSelect)[]) {
  const orderedDates = [...new Set(candidates.map((task) => task.dueDate))].sort((left, right) => {
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;
    return left.localeCompare(right);
  });
  for (const dueDate of orderedDates) {
    const dated = candidates.filter((task) => task.dueDate === dueDate);
    const permissions = await Promise.all(dated.map((task) => auth.canAccessTask(context.db, context.user.id, task.id, context.space.id, "view")));
    const visible = dated.filter((_, index) => permissions[index]);
    if (visible.length) return visible;
  }
  return [];
}

async function visibleDirectParent(context: PersonalContext, task: typeof tasks.$inferSelect) {
  if (task.parentTaskId) {
    if (!await auth.canAccessTask(context.db, context.user.id, task.parentTaskId, context.space.id, "view")) return null;
    const [parent] = await context.db.select({ title: tasks.title }).from(tasks).where(eq(tasks.id, task.parentTaskId)).limit(1);
    return parent ? { type: "task" as const, id: task.parentTaskId, title: parent.title } : null;
  }
  const [attachment] = await context.db.select({ type: hierarchyAttachments.parentType, id: hierarchyAttachments.parentId }).from(hierarchyAttachments).where(and(eq(hierarchyAttachments.childType, "task"), eq(hierarchyAttachments.childId, task.id))).limit(1);
  if (!attachment?.type || !attachment.id || !itemTypes.includes(attachment.type as ItemType)) return null;
  if (!await allowedInContext(context, attachment.type as ItemType, attachment.id)) return null;
  const item = await getItem(attachment.type as ItemType, attachment.id) as { title?: string; name?: string };
  return { type: attachment.type as ItemType, id: attachment.id, title: item.title ?? item.name ?? null };
}

/** Returns one visible open task anywhere below an item in a single MCP call. */
export async function nextTaskForItem(args: Record<string, unknown>, random = Math.random) {
  const context = (await ensurePersonalContext())!;
  const type = args.type as ItemType;
  const id = typeof args.id === "string" ? args.id : "";
  if (!itemTypes.includes(type) || !id) throw new Error("Informe um tipo e um ID válidos.");
  if (!await allowedInContext(context, type, id)) throw new Error("Item não encontrado ou sem acesso.");

  await getEffectiveCyclicQueueState(context.db, context.space.id);

  const ids = await descendantTaskIds(context, type, id);
  if (!ids.length) return { scope: { type, id }, task: null, ordering: "Menor dueDate; datas nulas por último; empate aleatório." };
  const candidates = [] as (typeof tasks.$inferSelect)[];
  for (let index = 0; index < ids.length; index += 50) {
    candidates.push(...await context.db.select().from(tasks).where(and(
      inArray(tasks.id, ids.slice(index, index + 50)),
      inArray(tasks.status, openTaskStatuses),
      isNull(tasks.deletedAt),
    )));
  }
  const tied = await visibleTasksAtEarliestDate(context, candidates);
  if (!tied.length) return { scope: { type, id }, task: null, ordering: "Menor dueDate; datas nulas por último; empate aleatório." };
  tied.sort((left, right) => left.id.localeCompare(right.id));
  const selected = tied[Math.min(tied.length - 1, Math.max(0, Math.floor(random() * tied.length)))]!;
  const successorRows = await context.db.select({ id: dependencyEdges.successorId }).from(dependencyEdges).where(and(
    eq(dependencyEdges.predecessorType, "task"),
    eq(dependencyEdges.predecessorId, selected.id),
    eq(dependencyEdges.successorType, "task"),
  ));
  const successorPermissions = await Promise.all(successorRows.map((successor) => auth.canAccessTask(context.db, context.user.id, successor.id, context.space.id, "view")));
  const directDependentTaskIds = successorRows.filter((_, index) => successorPermissions[index]).map((successor) => successor.id).sort();
  const parent = await visibleDirectParent(context, selected);

  return {
    scope: { type, id },
    task: { ...selected, parent, directDependentTaskIds },
    tieCount: tied.length,
    ordering: "Menor dueDate; datas nulas por último; empate aleatório.",
  };
}
