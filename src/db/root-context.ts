import { and, asc, eq, isNull } from "drizzle-orm";
import { canAccessOrganization, canAccessProcess, canAccessProduct, canAccessProject, canAccessTask, canItem } from "./authorization";
import type { PersonalContext } from "./current-user";
import { departments, hierarchyAttachments, organizations, processes, products, projects, tasks, teams } from "./schema";

type RootChildType = "department" | "team" | "project" | "product" | "process" | "task";

function isRootAttachment(attachment: { parentType: string | null; parentId: string | null } | undefined) {
  return attachment === undefined || (attachment.parentType === null && attachment.parentId === null);
}

function productCharacteristics(characteristicsJson: string) {
  try {
    const value = JSON.parse(characteristicsJson);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

/**
 * Selects the globally visible, unattached hierarchy roots for one personal
 * context. A root has no attachment row or has a fully empty attachment; a
 * partially empty attachment is malformed and deliberately omitted.
 */
export async function rootContext(context: PersonalContext) {
  const [organizationRows, departmentRows, teamRows, projectRows, productRows, processRows, taskRows, attachments] = await Promise.all([
    context.db.select().from(organizations).orderBy(asc(organizations.name)),
    context.db.select().from(departments).where(isNull(departments.organizationId)).orderBy(asc(departments.name)),
    context.db.select().from(teams).where(isNull(teams.organizationId)).orderBy(asc(teams.name)),
    context.db.select().from(projects).where(isNull(projects.organizationId)).orderBy(asc(projects.createdAt)),
    context.db.select().from(products).where(isNull(products.organizationId)).orderBy(asc(products.createdAt)),
    context.db.select().from(processes).where(isNull(processes.organizationId)).orderBy(asc(processes.createdAt)),
    context.db.select().from(tasks).where(and(isNull(tasks.organizationId), isNull(tasks.parentTaskId), isNull(tasks.deletedAt))).orderBy(asc(tasks.createdAt)),
    context.db.select().from(hierarchyAttachments),
  ]);

  const attachmentByChild = new Map(attachments.map((attachment) => [`${attachment.childType}:${attachment.childId}`, attachment]));
  const roots = <T extends { id: string }>(type: RootChildType, rows: T[]) => rows.filter((row) => isRootAttachment(attachmentByChild.get(`${type}:${row.id}`)));
  const accessible = async <T>(rows: T[], allows: (row: T) => Promise<boolean>) => {
    const permissions = await Promise.all(rows.map(allows));
    return rows.filter((_, index) => permissions[index]);
  };

  const [organizationsVisible, departmentsVisible, teamsVisible, projectsVisible, productsVisible, processesVisible, tasksVisible] = await Promise.all([
    accessible(organizationRows, async (organization) => await canAccessOrganization(context.db, context.user.id, context.user.email, organization.id, "view")),
    accessible(roots("department", departmentRows), async (department) => department.ownerUserId === context.user.id || await canItem(context.db, context.user.id, "department", department.id, "view")),
    accessible(roots("team", teamRows), async (team) => team.ownerUserId === context.user.id || await canItem(context.db, context.user.id, "team", team.id, "view")),
    accessible(roots("project", projectRows), async (project) => await canAccessProject(context.db, context.user.id, project.id, context.space.id, "view")),
    accessible(roots("product", productRows), async (product) => await canAccessProduct(context.db, context.user.id, product.id, context.space.id, "view")),
    accessible(roots("process", processRows), async (process) => await canAccessProcess(context.db, context.user.id, process.id, context.space.id, "view")),
    accessible(roots("task", taskRows), async (task) => await canAccessTask(context.db, context.user.id, task.id, context.space.id, "view")),
  ]);

  return {
    organizations: organizationsVisible,
    departments: departmentsVisible.map((department) => ({ ...department, parentType: null, parentId: null, parentName: null })),
    teams: teamsVisible.map((team) => ({ ...team, parentType: null, parentId: null, parentName: null })),
    projects: projectsVisible.map((project) => ({ ...project, parentType: null, parentId: null, parentName: null })),
    products: productsVisible.map((product) => ({ ...product, parentType: null, parentId: null, parentName: null, characteristics: productCharacteristics(product.characteristicsJson) })),
    processes: processesVisible.map((process) => ({ ...process, parentType: null, parentId: null, parentName: null })),
    tasks: tasksVisible.map((task) => ({ ...task, parentType: null, parentId: null, parentName: null, tags: [], checklistTotal: 0, checklistCompleted: 0 })),
    canCreate: false,
  };
}
