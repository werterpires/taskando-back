import { and, eq } from "drizzle-orm";
import type { ensurePersonalContext } from "./current-user";
import { departments, fronts, itemRoleAssignments, organizationMembers, organizations, phases, processes, products, projects, taskAssignees, tasks, teams, users } from "./schema";

export const ownerTransferItemTypes = ["organization", "department", "team", "project", "front", "product", "process", "phase", "task"] as const;
export type OwnerTransferItemType = typeof ownerTransferItemTypes[number];
type Context = NonNullable<Awaited<ReturnType<typeof ensurePersonalContext>>>;

export type OwnerTransferItem = {
  id: string;
  type: OwnerTransferItemType;
  name: string;
  ownerUserId: string;
  organizationId: string | null;
  personalSpaceId: string | null;
  authorUserId: string | null;
};

export async function getOwnerTransferItem(context: Context, type: OwnerTransferItemType, id: string): Promise<OwnerTransferItem | null> {
  if (type === "organization") {
    const [item] = await context.db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
    return item ? { id, type, name: item.name, ownerUserId: item.ownerUserId, organizationId: id, personalSpaceId: null, authorUserId: null } : null;
  }
  if (type === "department") {
    const [item] = await context.db.select().from(departments).where(eq(departments.id, id)).limit(1);
    return item?.ownerUserId ? { id, type, name: item.name, ownerUserId: item.ownerUserId, organizationId: item.organizationId, personalSpaceId: null, authorUserId: null } : null;
  }
  if (type === "team") {
    const [item] = await context.db.select().from(teams).where(eq(teams.id, id)).limit(1);
    return item?.ownerUserId ? { id, type, name: item.name, ownerUserId: item.ownerUserId, organizationId: item.organizationId, personalSpaceId: null, authorUserId: null } : null;
  }
  if (type === "project") {
    const [item] = await context.db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return item ? { id, type, name: item.title, ownerUserId: item.ownerUserId, organizationId: item.organizationId, personalSpaceId: item.personalSpaceId, authorUserId: item.authorUserId } : null;
  }
  if (type === "front") {
    const [item] = await context.db.select().from(fronts).where(eq(fronts.id, id)).limit(1);
    return item ? { id, type, name: item.title, ownerUserId: item.ownerUserId, organizationId: item.organizationId, personalSpaceId: item.personalSpaceId, authorUserId: item.authorUserId } : null;
  }
  if (type === "product") {
    const [item] = await context.db.select().from(products).where(eq(products.id, id)).limit(1);
    return item ? { id, type, name: item.title, ownerUserId: item.ownerUserId, organizationId: item.organizationId, personalSpaceId: item.personalSpaceId, authorUserId: item.authorUserId } : null;
  }
  if (type === "process") {
    const [item] = await context.db.select().from(processes).where(eq(processes.id, id)).limit(1);
    return item ? { id, type, name: item.title, ownerUserId: item.ownerUserId, organizationId: item.organizationId, personalSpaceId: item.personalSpaceId, authorUserId: item.authorUserId } : null;
  }
  if (type === "phase") {
    const [item] = await context.db.select().from(phases).where(eq(phases.id, id)).limit(1);
    return item ? { id, type, name: item.title, ownerUserId: item.ownerUserId, organizationId: item.organizationId, personalSpaceId: item.personalSpaceId, authorUserId: item.authorUserId } : null;
  }
  const [item] = await context.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return item ? { id, type, name: item.title, ownerUserId: item.ownerUserId ?? item.authorUserId, organizationId: item.organizationId, personalSpaceId: item.personalSpaceId, authorUserId: item.authorUserId } : null;
}

export async function eligibleOwnerCandidates(context: Context, item: OwnerTransferItem) {
  const people = new Map<string, { id: string; displayName: string; email: string }>();
  if (item.organizationId) {
    const [organization, members] = await Promise.all([
      context.db.select({ id: users.id, displayName: users.displayName, email: users.email }).from(organizations).innerJoin(users, eq(organizations.ownerUserId, users.id)).where(eq(organizations.id, item.organizationId)).limit(1),
      context.db.select({ id: users.id, displayName: users.displayName, email: users.email }).from(organizationMembers).innerJoin(users, eq(organizationMembers.userId, users.id)).where(and(eq(organizationMembers.organizationId, item.organizationId), eq(organizationMembers.status, "active"))),
    ]);
    for (const person of [...organization, ...members]) people.set(person.id, person);
  } else {
    const [roles, assignees, author] = await Promise.all([
      context.db.select({ id: users.id, displayName: users.displayName, email: users.email }).from(itemRoleAssignments).innerJoin(users, eq(itemRoleAssignments.userId, users.id)).where(and(eq(itemRoleAssignments.itemType, item.type), eq(itemRoleAssignments.itemId, item.id))),
      item.type === "task" ? context.db.select({ id: users.id, displayName: users.displayName, email: users.email }).from(taskAssignees).innerJoin(users, eq(taskAssignees.userId, users.id)).where(eq(taskAssignees.taskId, item.id)) : Promise.resolve([]),
      item.authorUserId ? context.db.select({ id: users.id, displayName: users.displayName, email: users.email }).from(users).where(eq(users.id, item.authorUserId)).limit(1) : Promise.resolve([]),
    ]);
    for (const person of [...roles, ...assignees, ...author]) people.set(person.id, person);
  }
  people.delete(item.ownerUserId);
  return [...people.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, "pt-BR"));
}

export function ownerUpdateStatement(context: Context, item: OwnerTransferItem, ownerUserId: string, updatedAt: string) {
  if (item.type === "organization") return context.db.update(organizations).set({ ownerUserId, updatedAt }).where(and(eq(organizations.id, item.id), eq(organizations.ownerUserId, item.ownerUserId)));
  if (item.type === "department") return context.db.update(departments).set({ ownerUserId, updatedAt }).where(and(eq(departments.id, item.id), eq(departments.ownerUserId, item.ownerUserId)));
  if (item.type === "team") return context.db.update(teams).set({ ownerUserId, updatedAt }).where(and(eq(teams.id, item.id), eq(teams.ownerUserId, item.ownerUserId)));
  if (item.type === "project") return context.db.update(projects).set({ ownerUserId, updatedAt }).where(and(eq(projects.id, item.id), eq(projects.ownerUserId, item.ownerUserId)));
  if (item.type === "front") return context.db.update(fronts).set({ ownerUserId, updatedAt }).where(and(eq(fronts.id, item.id), eq(fronts.ownerUserId, item.ownerUserId)));
  if (item.type === "product") return context.db.update(products).set({ ownerUserId, updatedAt }).where(and(eq(products.id, item.id), eq(products.ownerUserId, item.ownerUserId)));
  if (item.type === "process") return context.db.update(processes).set({ ownerUserId, updatedAt }).where(and(eq(processes.id, item.id), eq(processes.ownerUserId, item.ownerUserId)));
  if (item.type === "phase") return context.db.update(phases).set({ ownerUserId, updatedAt }).where(and(eq(phases.id, item.id), eq(phases.ownerUserId, item.ownerUserId)));
  return context.db.update(tasks).set({ ownerUserId, updatedAt }).where(eq(tasks.id, item.id));
}

export const ownerTransferTypeLabel: Record<OwnerTransferItemType, string> = {
  organization: "Organização", department: "Departamento", team: "Time", project: "Projeto", front: "Frente", product: "Produto", process: "Processo", phase: "Fase", task: "Tarefa",
};
