import { inArray } from "drizzle-orm";
import type { getDb } from ".";
import { departments, fronts, organizations, processes, products, projects, teams } from "./schema";

type Database = Awaited<ReturnType<typeof getDb>>;
type Attachment = { childType: string; childId: string; parentType: string | null; parentId: string | null };

/** Returns only the direct parent's name, keyed by `childType:childId`. */
export async function parentNamesByChild(db: Database, attachments: Attachment[]) {
  const ids = {
    organization: new Set<string>(),
    department: new Set<string>(),
    team: new Set<string>(),
    project: new Set<string>(),
    front: new Set<string>(),
    product: new Set<string>(),
    process: new Set<string>(),
  };

  for (const attachment of attachments) {
    if (attachment.parentId && attachment.parentType! in ids) {
      ids[attachment.parentType as keyof typeof ids].add(attachment.parentId);
    }
  }

  const rowsFor = async (type: keyof typeof ids) => {
    const values = [...ids[type]];
    if (!values.length) return [] as { id: string; name: string }[];
    if (type === "organization") return await db.select({ id: organizations.id, name: organizations.name }).from(organizations).where(inArray(organizations.id, values));
    if (type === "department") return await db.select({ id: departments.id, name: departments.name }).from(departments).where(inArray(departments.id, values));
    if (type === "team") return await db.select({ id: teams.id, name: teams.name }).from(teams).where(inArray(teams.id, values));
    if (type === "project") return await db.select({ id: projects.id, name: projects.title }).from(projects).where(inArray(projects.id, values));
    if (type === "front") return await db.select({ id: fronts.id, name: fronts.title }).from(fronts).where(inArray(fronts.id, values));
    if (type === "product") return await db.select({ id: products.id, name: products.title }).from(products).where(inArray(products.id, values));
    return await db.select({ id: processes.id, name: processes.title }).from(processes).where(inArray(processes.id, values));
  };

  const [organizationRows, departmentRows, teamRows, projectRows, frontRows, productRows, processRows] = await Promise.all([
    rowsFor("organization"), rowsFor("department"), rowsFor("team"), rowsFor("project"), rowsFor("front"), rowsFor("product"), rowsFor("process"),
  ]);
  const names = {
    organization: new Map(organizationRows.map((row) => [row.id, row.name])),
    department: new Map(departmentRows.map((row) => [row.id, row.name])),
    team: new Map(teamRows.map((row) => [row.id, row.name])),
    project: new Map(projectRows.map((row) => [row.id, row.name])),
    front: new Map(frontRows.map((row) => [row.id, row.name])),
    product: new Map(productRows.map((row) => [row.id, row.name])),
    process: new Map(processRows.map((row) => [row.id, row.name])),
  };
  const result = new Map<string, string>();

  for (const attachment of attachments) {
    if (!attachment.parentId || !attachment.parentType || !(attachment.parentType! in names)) continue;
    const name = names[attachment.parentType as keyof typeof names].get(attachment.parentId);
    if (name) result.set(`${attachment.childType}:${attachment.childId}`, name);
  }

  return result;
}
