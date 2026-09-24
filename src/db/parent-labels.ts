import { and, eq, inArray } from "drizzle-orm";
import type { getDb } from ".";
import { departments, fronts, hierarchyAttachments, organizations, phases, processes, products, projects, teams } from "./schema";

type Database = Awaited<ReturnType<typeof getDb>>;
type Attachment = { childType: string; childId: string; parentType: string | null; parentId: string | null };
type HierarchyType = "organization" | "department" | "team" | "project" | "front" | "product" | "process" | "phase";
export type ParentChainItem = { type: HierarchyType; id: string; name: string };

const hierarchyTypes = new Set<HierarchyType>(["organization", "department", "team", "project", "front", "product", "process", "phase"]);

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
    return await db.select({ id: phases.id, name: phases.title }).from(phases).where(inArray(phases.id, values));
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
    frontier = parentRows.flatMap((row) => row.parentId && isHierarchyType(row.parentType) ? [{ type: row.parentType, id: row.parentId }] : []);
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
