import { and, eq } from "drizzle-orm";
import { effectiveCapabilities, type Capability, type ItemRole } from "./capabilities";
import { getDb } from ".";
import { departments, fronts, hierarchyAttachments, itemRoleAssignments, organizationMembers, organizations, phases, processes, products, projects, recurrenceOccurrences, taskAssignees, tasks, teams } from "./schema";

type Database = Awaited<ReturnType<typeof getDb>>;
export async function itemCapabilities(db: Database, userId: string, itemType: typeof itemRoleAssignments.$inferSelect.itemType, itemId: string) {
  const rows = await db.select({ role: itemRoleAssignments.role }).from(itemRoleAssignments).where(and(eq(itemRoleAssignments.itemType, itemType), eq(itemRoleAssignments.itemId, itemId), eq(itemRoleAssignments.userId, userId)));
  return effectiveCapabilities(rows.map((row) => row.role as ItemRole));
}
export async function canItem(db: Database, userId: string, itemType: typeof itemRoleAssignments.$inferSelect.itemType, itemId: string, capability: Capability) {
  return (await itemCapabilities(db, userId, itemType, itemId)).has(capability);
}
async function canViewChildrenOf(db: Database, userId: string, itemType: "organization" | "department" | "team" | "project" | "front" | "product" | "process" | "phase", itemId: string) {
  if (itemType === "organization") {
    const [item] = await db.select({ ownerUserId: organizations.ownerUserId }).from(organizations).where(eq(organizations.id, itemId)).limit(1);
    return Boolean(item && (item.ownerUserId === userId || await canItem(db, userId, "organization", itemId, "view_children")));
  }
  if (itemType === "department") {
    const [item] = await db.select({ ownerUserId: departments.ownerUserId }).from(departments).where(eq(departments.id, itemId)).limit(1);
    return Boolean(item && (item.ownerUserId === userId || await canItem(db, userId, "department", itemId, "view_children")));
  }
  if (itemType === "team") {
    const [item] = await db.select({ ownerUserId: teams.ownerUserId }).from(teams).where(eq(teams.id, itemId)).limit(1);
    return Boolean(item && (item.ownerUserId === userId || await canItem(db, userId, "team", itemId, "view_children")));
  }
  if (itemType === "front") {
    const [item] = await db.select({ ownerUserId: fronts.ownerUserId, authorUserId: fronts.authorUserId }).from(fronts).where(eq(fronts.id, itemId)).limit(1);
    return Boolean(item && (item.ownerUserId === userId || item.authorUserId === userId || await canItem(db, userId, "front", itemId, "view_children")));
  }
  if (itemType === "product") {
    const [item] = await db.select({ ownerUserId: products.ownerUserId, authorUserId: products.authorUserId }).from(products).where(eq(products.id, itemId)).limit(1);
    return Boolean(item && (item.ownerUserId === userId || item.authorUserId === userId || await canItem(db, userId, "product", itemId, "view_children")));
  }
  if (itemType === "process") {
    const [item] = await db.select({ ownerUserId: processes.ownerUserId, authorUserId: processes.authorUserId }).from(processes).where(eq(processes.id, itemId)).limit(1);
    return Boolean(item && (item.ownerUserId === userId || item.authorUserId === userId || await canItem(db, userId, "process", itemId, "view_children")));
  }
  if (itemType === "phase") {
    const [item] = await db.select({ ownerUserId: phases.ownerUserId, authorUserId: phases.authorUserId }).from(phases).where(eq(phases.id, itemId)).limit(1);
    return Boolean(item && (item.ownerUserId === userId || item.authorUserId === userId || await canItem(db, userId, "phase", itemId, "view_children")));
  }
  const [item] = await db.select({ ownerUserId: projects.ownerUserId, authorUserId: projects.authorUserId }).from(projects).where(eq(projects.id, itemId)).limit(1);
  return Boolean(item && (item.ownerUserId === userId || item.authorUserId === userId || await canItem(db, userId, "project", itemId, "view_children")));
}
async function canViewByAncestor(db: Database, userId: string, childType: "project" | "front" | "product" | "process" | "phase" | "task", childId: string) {
  let currentType: string | null = childType; let currentId: string | null = childId;
  for (let depth = 0; currentType && currentId && depth < 8; depth += 1) {
    const [attachment] = await db.select({ parentType: hierarchyAttachments.parentType, parentId: hierarchyAttachments.parentId }).from(hierarchyAttachments).where(and(eq(hierarchyAttachments.childType, currentType as typeof hierarchyAttachments.$inferSelect.childType), eq(hierarchyAttachments.childId, currentId))).limit(1);
    if (!attachment?.parentType || !attachment.parentId) return false;
    if ((attachment.parentType === "organization" || attachment.parentType === "department" || attachment.parentType === "team" || attachment.parentType === "project" || attachment.parentType === "front" || attachment.parentType === "product" || attachment.parentType === "process" || attachment.parentType === "phase") && await canViewChildrenOf(db, userId, attachment.parentType, attachment.parentId)) return true;
    currentType = attachment.parentType; currentId = attachment.parentId;
  }
  return false;
}
async function canAccessTaskByRecurrence(db: Database, userId: string, taskId: string, capability: Capability) {
  const [occurrence] = await db.select({ seriesId: recurrenceOccurrences.seriesId }).from(recurrenceOccurrences).where(eq(recurrenceOccurrences.taskId, taskId)).limit(1);
  if (!occurrence) return false;
  const rolesInSeries = await db.select({ role: itemRoleAssignments.role }).from(itemRoleAssignments).innerJoin(recurrenceOccurrences, eq(itemRoleAssignments.itemId, recurrenceOccurrences.taskId)).where(and(eq(itemRoleAssignments.itemType, "task"), eq(recurrenceOccurrences.seriesId, occurrence.seriesId), eq(itemRoleAssignments.userId, userId)));
  return effectiveCapabilities(rolesInSeries.map((row) => row.role as ItemRole)).has(capability);
}
export async function canAccessTask(db: Database, userId: string, taskId: string, spaceId: string, capability: Capability = "view") {
  const [task] = await db.select({ ownerUserId: tasks.ownerUserId, authorUserId: tasks.authorUserId, personalSpaceId: tasks.personalSpaceId, organizationId: tasks.organizationId, deletedAt: tasks.deletedAt }).from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) return false;
  if (task.deletedAt) return false;
  if (task.ownerUserId === userId || task.authorUserId === userId) return true;
  if (task.organizationId !== null) { const [assignment] = await db.select({ userId: taskAssignees.userId }).from(taskAssignees).where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, userId))).limit(1); if (assignment && (capability === "view" || capability === "interact")) return true; }
  if (await canItem(db, userId, "task", taskId, capability)) return true;
  if (await canAccessTaskByRecurrence(db, userId, taskId, capability)) return true;
  if (capability === "view" && await canViewByAncestor(db, userId, "task", taskId)) return true;
  if (task.organizationId !== null && capability === "view") {
    const [membership] = await db.select({ id: organizationMembers.id }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, task.organizationId), eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active"))).limit(1);
    if (membership) return true;
  }
  return task.organizationId === null && task.personalSpaceId === spaceId;
}
export async function canAccessProject(db: Database, userId: string, projectId: string, spaceId: string, capability: Capability = "view") {
  const [project] = await db.select({ ownerUserId: projects.ownerUserId, authorUserId: projects.authorUserId, personalSpaceId: projects.personalSpaceId, organizationId: projects.organizationId }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) return false;
  if (project.ownerUserId === userId || project.authorUserId === userId) return true;
  if (await canItem(db, userId, "project", projectId, capability)) return true;
  if (capability === "view" && await canViewByAncestor(db, userId, "project", projectId)) return true;
  if (project.organizationId !== null && capability === "view") {
    const [membership] = await db.select({ id: organizationMembers.id }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, project.organizationId), eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active"))).limit(1);
    if (membership) return true;
  }
  return project.organizationId === null && project.personalSpaceId === spaceId;
}
export async function canAccessFront(db: Database, userId: string, frontId: string, spaceId: string, capability: Capability = "view") {
  const [front] = await db.select({ ownerUserId: fronts.ownerUserId, authorUserId: fronts.authorUserId, personalSpaceId: fronts.personalSpaceId, organizationId: fronts.organizationId }).from(fronts).where(eq(fronts.id, frontId)).limit(1);
  if (!front) return false;
  if (front.ownerUserId === userId || front.authorUserId === userId) return true;
  if (await canItem(db, userId, "front", frontId, capability)) return true;
  if (capability === "view" && await canViewByAncestor(db, userId, "front", frontId)) return true;
  if (front.organizationId !== null && capability === "view") {
    const [membership] = await db.select({ id: organizationMembers.id }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, front.organizationId), eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active"))).limit(1);
    if (membership) return true;
  }
  return front.organizationId === null && front.personalSpaceId === spaceId;
}
export async function canAccessProduct(db: Database, userId: string, productId: string, spaceId: string, capability: Capability = "view") {
  const [product] = await db.select({ ownerUserId: products.ownerUserId, authorUserId: products.authorUserId, personalSpaceId: products.personalSpaceId, organizationId: products.organizationId }).from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return false;
  if (product.ownerUserId === userId || product.authorUserId === userId) return true;
  if (await canItem(db, userId, "product", productId, capability)) return true;
  if (capability === "view" && await canViewByAncestor(db, userId, "product", productId)) return true;
  if (product.organizationId !== null && capability === "view") {
    const [membership] = await db.select({ id: organizationMembers.id }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, product.organizationId), eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active"))).limit(1);
    if (membership) return true;
  }
  return product.organizationId === null && product.personalSpaceId === spaceId;
}
export async function canAccessProcess(db: Database, userId: string, processId: string, spaceId: string, capability: Capability = "view") {
  const [process] = await db.select({ ownerUserId: processes.ownerUserId, authorUserId: processes.authorUserId, personalSpaceId: processes.personalSpaceId, organizationId: processes.organizationId }).from(processes).where(eq(processes.id, processId)).limit(1);
  if (!process) return false;
  if (process.ownerUserId === userId || process.authorUserId === userId) return true;
  if (await canItem(db, userId, "process", processId, capability)) return true;
  if (capability === "view" && await canViewByAncestor(db, userId, "process", processId)) return true;
  if (process.organizationId !== null && capability === "view") {
    const [membership] = await db.select({ id: organizationMembers.id }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, process.organizationId), eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active"))).limit(1);
    if (membership) return true;
  }
  return process.organizationId === null && process.personalSpaceId === spaceId;
}
export async function canAccessPhase(db: Database, userId: string, phaseId: string, spaceId: string, capability: Capability = "view") {
  const [phase] = await db.select({ ownerUserId: phases.ownerUserId, authorUserId: phases.authorUserId, personalSpaceId: phases.personalSpaceId, organizationId: phases.organizationId, processId: phases.processId }).from(phases).where(eq(phases.id, phaseId)).limit(1);
  if (!phase) return false;
  if (phase.ownerUserId === userId || phase.authorUserId === userId) return true;
  if (await canItem(db, userId, "phase", phaseId, capability)) return true;
  if (capability === "view" && await canAccessProcess(db, userId, phase.processId, spaceId, "view_children")) return true;
  if (phase.organizationId !== null && capability === "view") {
    const [membership] = await db.select({ id: organizationMembers.id }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, phase.organizationId), eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active"))).limit(1);
    if (membership) return true;
  }
  return phase.organizationId === null && phase.personalSpaceId === spaceId;
}
export async function canAccessOrganization(db: Database, userId: string, email: string, organizationId: string, capability: Capability = "view") {
  const [organization] = await db.select({ ownerUserId: organizations.ownerUserId }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);
  if (!organization) return false;
  if (organization.ownerUserId === userId) return true;
  if (await canItem(db, userId, "organization", organizationId, capability)) return true;
  const [legacy] = await db.select({ role: organizationMembers.role }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.email, email.toLowerCase()), eq(organizationMembers.status, "active"))).limit(1);
  return Boolean(legacy) && capability === "view";
}
