import { and, eq, inArray } from "drizzle-orm";
import type { getDb } from ".";
import { departments, fronts, hierarchyAttachments, organizations, phases, processes, products, projects, tasks, teams } from "./schema";

type Database = Awaited<ReturnType<typeof getDb>>;
type Attachment = { childType: string; childId: string; parentType: string | null; parentId: string | null };
type HierarchyType = "organization" | "department" | "team" | "project" | "front" | "product" | "process" | "phase" | "task";
export type ParentChainItem = { type: HierarchyType; id: string; name: string };

const hierarchyTypes = new Set<HierarchyType>(["organization", "department", "team", "project", "front", "product", "process", "phase", "task"]);

function isHierarchyType(value: string | null): value is HierarchyType {
  return value !== null && hierarchyTypes.has(value as HierarchyType);
}

async function hierarchyNames(db: Database, items: { type: HierarchyType; id: string }[]): Promise<Map<string, string>> {
  const ids = {
    organization: new Set<string>(),
    department: new Set<string>(),
    team: new Set<string>(),
    project: new Set<string>(),
    front: new Set<string>(),
    product: new Set<string>(),
    process: new Set<string>(),
    phase: new Set<string>(),
    task: new Set<string>(),
  } satisfies Record<HierarchyType, Set<string>>;

  for (const item of items) ids[item.type].add(item.id);

  const rowsFor = async (type: HierarchyType) => {
    const values = [...ids[type]];
    if (!values.length) return [] as { id: string; name: string }[];
    if (type === "organization") return await db.select({ id: organizations.id, name: organizations.name }).from(organizations).where(inArray(organizations.id, values));
    if (type === "department") return await db.select({ id: departments.id, name: departments.name }).from(departments).where(inArray(departments.id, values));
    if (type === "team") return await db.select({ id: teams.id, name: teams.name }).from(teams).where(inArray(teams.id, values));
    if (type === "project") return await db.select({ id: projects.id, name: projects.title }).from(projects).where(inArray(projects.id, values));
    if (type === "front") return await db.select({ id: fronts.id, name: fronts.title }).from(fronts).where(inArray(fronts.id, values));
    if (type === "product") return await db.select({ id: products.id, name: products.title }).from(products).where(inArray(products.id, values));
    if (type === "process") return await db.select({ id: processes.id, name: processes.title }).from(processes).where(inArray(processes.id, values));
    if (type === "phase") return await db.select({ id: phases.id, name: phases.title }).from(phases).where(inArray(phases.id, values));
    return await db.select({ id: tasks.id, name: tasks.title }).from(tasks).where(inArray(tasks.id, values));
  };

  const types = [...hierarchyTypes];
  const rows = await Promise.all(types.map(async (type) => [type, await rowsFor(type)] as const));
  return new Map(rows.flatMap(([type, values]) => values.map((row) => [`${type}:${row.id}`, row.name] as const)));
}

/** Returns only the direct parent's name, keyed by `childType:childId`. */
export async function parentNamesByChild(db: Database, attachments: Attachment[]) {
  const parents = attachments.flatMap((attachment) => attachment.parentId && isHierarchyType(attachment.parentType) ? [{ type: attachment.parentType, id: attachment.parentId }] : []);
  const names = await hierarchyNames(db, parents);
  const result = new Map<string, string>();

  for (const attachment of attachments) {
    if (!attachment.parentId || !isHierarchyType(attachment.parentType)) continue;
    const name = names.get(`${attachment.parentType}:${attachment.parentId}`);
    if (name) result.set(`${attachment.childType}:${attachment.childId}`, name);
  }

  return result;
}

/** Returns each child's ancestors ordered from the hierarchy root to its direct parent. */
export async function parentChainsByChild(db: Database, attachments: Attachment[]) {
  const attachmentByChild = new Map(attachments.map((attachment) => [`${attachment.childType}:${attachment.childId}`, attachment]));
  let frontier = attachments.flatMap((attachment) => attachment.parentId && isHierarchyType(attachment.parentType) ? [{ type: attachment.parentType, id: attachment.parentId }] : []);
  const visited = new Set<string>();

  while (frontier.length) {
    const pending = frontier.filter((item) => !visited.has(`${item.type}:${item.id}`));
    if (!pending.length) break;
    for (const item of pending) visited.add(`${item.type}:${item.id}`);

    const byType = new Map<Exclude<HierarchyType, "organization">, string[]>();
    for (const item of pending) {
      if (item.type === "organization") continue;
      byType.set(item.type, [...(byType.get(item.type) ?? []), item.id]);
    }
    const parentRows = (await Promise.all([...byType].map(([type, ids]) => db.select().from(hierarchyAttachments).where(and(eq(hierarchyAttachments.childType, type), inArray(hierarchyAttachments.childId, ids)))))).flat();
    for (const row of parentRows) attachmentByChild.set(`${row.childType}:${row.childId}`, row);

    const phaseIds = byType.get("phase")?.filter((id) => !attachmentByChild.has(`phase:${id}`));
    if (phaseIds?.length) {
      const phaseRows = await db.select({ id: phases.id, processId: phases.processId }).from(phases).where(inArray(phases.id, phaseIds));
      for (const phase of phaseRows) {
        if (phase.processId) {
          attachmentByChild.set(`phase:${phase.id}`, { childType: "phase", childId: phase.id, parentType: "process", parentId: phase.processId });
        }
      }
    }

    const taskIds = byType.get("task")?.filter((id) => !attachmentByChild.has(`task:${id}`));
    if (taskIds?.length) {
      const taskRows = await db.select({ id: tasks.id, parentTaskId: tasks.parentTaskId }).from(tasks).where(inArray(tasks.id, taskIds));
      for (const task of taskRows) {
        if (task.parentTaskId) {
          attachmentByChild.set(`task:${task.id}`, { childType: "task", childId: task.id, parentType: "task", parentId: task.parentTaskId });
        }
      }
    }

    const deptIds = byType.get("department")?.filter((id) => !attachmentByChild.has(`department:${id}`));
    if (deptIds?.length) {
      const deptRows = await db.select({ id: departments.id, organizationId: departments.organizationId }).from(departments).where(inArray(departments.id, deptIds));
      for (const dept of deptRows) {
        if (dept.organizationId) {
          attachmentByChild.set(`department:${dept.id}`, { childType: "department", childId: dept.id, parentType: "organization", parentId: dept.organizationId });
        }
      }
    }

    const teamIds = byType.get("team")?.filter((id) => !attachmentByChild.has(`team:${id}`));
    if (teamIds?.length) {
      const teamRows = await db.select({ id: teams.id, organizationId: teams.organizationId }).from(teams).where(inArray(teams.id, teamIds));
      for (const team of teamRows) {
        if (team.organizationId) {
          attachmentByChild.set(`team:${team.id}`, { childType: "team", childId: team.id, parentType: "organization", parentId: team.organizationId });
        }
      }
    }

    frontier = [...attachmentByChild.values()].flatMap((row) => row.parentId && isHierarchyType(row.parentType) ? [{ type: row.parentType, id: row.parentId }] : []);
  }

  const parentItems = [...attachmentByChild.values()].flatMap((attachment) => attachment.parentId && isHierarchyType(attachment.parentType) ? [{ type: attachment.parentType, id: attachment.parentId }] : []);
  const names = await hierarchyNames(db, parentItems);
  const result = new Map<string, ParentChainItem[]>();

  for (const child of attachments) {
    const chain: ParentChainItem[] = [];
    const seen = new Set<string>();
    let current: Attachment | undefined = child;
    while (current?.parentId && isHierarchyType(current.parentType)) {
      const key = `${current.parentType}:${current.parentId}`;
      if (seen.has(key)) break;
      seen.add(key);
      const name = names.get(key);
      if (name) chain.push({ type: current.parentType, id: current.parentId, name });
      current = attachmentByChild.get(key);
    }
    result.set(`${child.childType}:${child.childId}`, chain.reverse());
  }

  return result;
}

/** Resolves the complete ancestor chain for a specific item from root to direct parent. */
export async function parentChainForItem(db: Database, type: string, id: string): Promise<ParentChainItem[]> {
  if (type === "organization") return [];
  let directParent: { parentType: string | null; parentId: string | null } | null = null;
  if (type === "phase") {
    const [phase] = await db.select({ processId: phases.processId }).from(phases).where(eq(phases.id, id)).limit(1);
    if (phase?.processId) directParent = { parentType: "process", parentId: phase.processId };
  } else if (type === "department") {
    const [attachment] = await db.select().from(hierarchyAttachments).where(and(eq(hierarchyAttachments.childType, "department"), eq(hierarchyAttachments.childId, id))).limit(1);
    if (attachment?.parentId && isHierarchyType(attachment.parentType)) {
      directParent = { parentType: attachment.parentType, parentId: attachment.parentId };
    } else {
      const [dept] = await db.select({ organizationId: departments.organizationId }).from(departments).where(eq(departments.id, id)).limit(1);
      if (dept?.organizationId) directParent = { parentType: "organization", parentId: dept.organizationId };
    }
  } else if (type === "team") {
    const [attachment] = await db.select().from(hierarchyAttachments).where(and(eq(hierarchyAttachments.childType, "team"), eq(hierarchyAttachments.childId, id))).limit(1);
    if (attachment?.parentId && isHierarchyType(attachment.parentType)) {
      directParent = { parentType: attachment.parentType, parentId: attachment.parentId };
    } else {
      const [team] = await db.select({ organizationId: teams.organizationId }).from(teams).where(eq(teams.id, id)).limit(1);
      if (team?.organizationId) directParent = { parentType: "organization", parentId: team.organizationId };
    }
  } else if (type === "task") {
    const [attachment] = await db.select().from(hierarchyAttachments).where(and(eq(hierarchyAttachments.childType, "task"), eq(hierarchyAttachments.childId, id))).limit(1);
    if (attachment?.parentId && isHierarchyType(attachment.parentType)) {
      directParent = { parentType: attachment.parentType, parentId: attachment.parentId };
    } else {
      const [task] = await db.select({ parentTaskId: tasks.parentTaskId }).from(tasks).where(eq(tasks.id, id)).limit(1);
      if (task?.parentTaskId) directParent = { parentType: "task", parentId: task.parentTaskId };
    }
  } else {
    const [attachment] = await db.select().from(hierarchyAttachments).where(and(eq(hierarchyAttachments.childType, type), eq(hierarchyAttachments.childId, id))).limit(1);
    if (attachment?.parentId && isHierarchyType(attachment.parentType)) {
      directParent = { parentType: attachment.parentType, parentId: attachment.parentId };
    }
  }

  if (!directParent || !directParent.parentId || !isHierarchyType(directParent.parentType)) return [];
  const chains = await parentChainsByChild(db, [{ childType: type, childId: id, parentType: directParent.parentType, parentId: directParent.parentId }]);
  return chains.get(`${type}:${id}`) ?? [];
}
