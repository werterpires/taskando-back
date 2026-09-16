import { and, asc, eq, isNull } from "drizzle-orm";
import { canAccessOrganization, canAccessProcess, canAccessProduct, canAccessProject, canAccessTask, canItem } from "../../../db/authorization";
import { ensurePersonalContext } from "../../../db/current-user";
import { parentNamesByChild } from "../../../db/parent-labels";
import { rootContext } from "../../../db/root-context";
import { departments, hierarchyAttachments, itemRoleAssignments, organizationMembers, organizations, processes, products, projects, taskAssignees, tasks, teams } from "../../../db/schema";
import { includesWorkStatus, parseWorkStatusFilter } from "../../../db/work-status-filter";

type ParentType = "root" | "personal" | "organization" | "department" | "team";
type ItemType = "department" | "team" | "project" | "product" | "process" | "task";

export async function GET(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const url = new URL(request.url); const parentType = url.searchParams.get("parentType") as ParentType | null; const parentId = url.searchParams.get("parentId");
  if (!parentType || !["root", "personal", "organization", "department", "team"].includes(parentType)) return Response.json({ error: "Contexto inválido." }, { status: 400 });
  const parsed = parseWorkStatusFilter(request);
  if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 });
  if (parentType === "root") {
    if (url.searchParams.has("parentId")) return Response.json({ error: "A raiz global não aceita parentId." }, { status: 400 });
    return Response.json(await rootContext(context, parsed.filter));
  }

  let organizationId: string | null = null; let canCreate = parentType === "personal";
  if (parentType === "organization") {
    if (!parentId || !await canAccessOrganization(context.db, context.user.id, context.user.email, parentId, "view")) return Response.json({ error: "Sem acesso a esta organização." }, { status: 403 });
    organizationId = parentId; canCreate = await canAccessOrganization(context.db, context.user.id, context.user.email, parentId, "add_children");
  }
  if (parentType === "department" || parentType === "team") {
    if (!parentId) return Response.json({ error: "Item de contexto inválido." }, { status: 400 });
    const table = parentType === "department" ? departments : teams;
    const [parent] = await context.db.select().from(table).where(eq(table.id, parentId)).limit(1);
    if (!parent) return Response.json({ error: "Item não encontrado." }, { status: 404 });
    organizationId = parent.organizationId;
    const allowed = parent.ownerUserId === context.user.id || await canItem(context.db, context.user.id, parentType, parentId, "view") || (organizationId !== null && await canAccessOrganization(context.db, context.user.id, context.user.email, organizationId, "view"));
    if (!allowed) return Response.json({ error: "Sem acesso a este item." }, { status: 403 });
    canCreate = parent.ownerUserId === context.user.id || await canItem(context.db, context.user.id, parentType, parentId, "add_children") || (organizationId !== null && await canAccessOrganization(context.db, context.user.id, context.user.email, organizationId, "add_children"));
  }

  if (parentType === "personal") {
    const [allDepartments, allTeams, allProjects, allProducts, allProcesses, allTasks, attachments, roleRows, assignedRows, memberRows, organizationRows] = await Promise.all([
      context.db.select().from(departments).orderBy(asc(departments.name)),
      context.db.select().from(teams).orderBy(asc(teams.name)),
      context.db.select().from(projects).orderBy(asc(projects.createdAt)),
      context.db.select().from(products).orderBy(asc(products.createdAt)),
      context.db.select().from(processes).orderBy(asc(processes.createdAt)),
      context.db.select().from(tasks).where(and(isNull(tasks.parentTaskId), isNull(tasks.deletedAt))).orderBy(asc(tasks.createdAt)),
      context.db.select().from(hierarchyAttachments),
      context.db.select({ itemType: itemRoleAssignments.itemType, itemId: itemRoleAssignments.itemId }).from(itemRoleAssignments).where(eq(itemRoleAssignments.userId, context.user.id)),
      context.db.select({ taskId: taskAssignees.taskId }).from(taskAssignees).where(eq(taskAssignees.userId, context.user.id)),
      context.db.select({ organizationId: organizationMembers.organizationId }).from(organizationMembers).where(and(eq(organizationMembers.email, context.user.email.toLowerCase()), eq(organizationMembers.status, "active"))),
      context.db.select({ id: organizations.id }).from(organizations).where(eq(organizations.ownerUserId, context.user.id)),
    ]);
    const roles = new Set(roleRows.map((row) => `${row.itemType}:${row.itemId}`));
    const assigned = new Set(assignedRows.map((row) => row.taskId));
    const participatingOrganizations = new Set([...memberRows.map((row) => row.organizationId), ...organizationRows.map((row) => row.id)]);
    const attachmentByChild = new Map(attachments.map((item) => [`${item.childType}:${item.childId}`, item]));
    const parentNames = await parentNamesByChild(context.db, attachments);
    const withParent = <T extends { id: string }>(type: ItemType, item: T) => { const attachment = attachmentByChild.get(`${type}:${item.id}`); return { ...item, parentType: attachment?.parentType ?? null, parentId: attachment?.parentId ?? null, parentName: parentNames.get(`${type}:${item.id}`) ?? null }; };
    const participates = (type: ItemType, item: { id: string; ownerUserId?: string | null; authorUserId?: string | null }) => roles.has(`${type}:${item.id}`) || item.ownerUserId === context.user.id || item.authorUserId === context.user.id || (type === "task" && assigned.has(item.id));
    const directDepartmentIds = new Set(allDepartments.filter((item) => participates("department", item)).map((item) => item.id));
    const directTeamIds = new Set(allTeams.filter((item) => participates("team", item)).map((item) => item.id));
    const filteredProjects = allProjects.filter((item) => includesWorkStatus(parsed.filter, item.status));
    const filteredProducts = allProducts.filter((item) => includesWorkStatus(parsed.filter, item.status));
    const filteredProcesses = allProcesses.filter((item) => includesWorkStatus(parsed.filter, item.status));
    const filteredTasks = allTasks.filter((item) => includesWorkStatus(parsed.filter, item.status));
    const directProjectIds = new Set(filteredProjects.filter((item) => participates("project", item)).map((item) => item.id));
    const directProductIds = new Set(filteredProducts.filter((item) => participates("product", item)).map((item) => item.id));
    const directProcessIds = new Set(filteredProcesses.filter((item) => participates("process", item)).map((item) => item.id));
    const directTaskIds = new Set(filteredTasks.filter((item) => participates("task", item)).map((item) => item.id));
    const directParent = (type: ItemType, id: string) => {
      const attachment = attachmentByChild.get(`${type}:${id}`);
      return Boolean(attachment?.parentType && attachment.parentId);
    };
    const root = <T extends { id: string }>(type: ItemType, items: T[], ids: Set<string>) => items.filter((item) => ids.has(item.id) && !directParent(type, item.id));
    return Response.json({
      departments: root("department", allDepartments, directDepartmentIds).map((item) => withParent("department", item)),
      teams: root("team", allTeams, directTeamIds).map((item) => withParent("team", item)),
      projects: root("project", filteredProjects, directProjectIds).map((item) => withParent("project", item)),
      products: root("product", filteredProducts, directProductIds).map((item) => ({ ...withParent("product", item), characteristics: (() => { try { const value = JSON.parse(item.characteristicsJson); return Array.isArray(value) ? value : []; } catch { return []; } })() })),
      processes: root("process", filteredProcesses, directProcessIds).map((item) => withParent("process", item)),
      tasks: root("task", filteredTasks, directTaskIds).map((item) => ({ ...withParent("task", item), tags: [], checklistTotal: 0, checklistCompleted: 0 })),
      canCreate,
    });
  }

  const [allDepartments, allTeams, taskRows, projectRows, productRows, processRows, attachments] = await Promise.all([
    organizationId === null ? context.db.select().from(departments).where(isNull(departments.organizationId)).orderBy(asc(departments.name)) : context.db.select().from(departments).where(eq(departments.organizationId, organizationId)).orderBy(asc(departments.name)),
    organizationId === null ? context.db.select().from(teams).where(isNull(teams.organizationId)).orderBy(asc(teams.name)) : context.db.select().from(teams).where(eq(teams.organizationId, organizationId)).orderBy(asc(teams.name)),
    organizationId === null ? context.db.select().from(tasks).where(and(isNull(tasks.organizationId), isNull(tasks.parentTaskId), isNull(tasks.deletedAt))).orderBy(asc(tasks.createdAt)) : context.db.select().from(tasks).where(and(eq(tasks.organizationId, organizationId), isNull(tasks.parentTaskId), isNull(tasks.deletedAt))).orderBy(asc(tasks.createdAt)),
    organizationId === null ? context.db.select().from(projects).where(isNull(projects.organizationId)).orderBy(asc(projects.createdAt)) : context.db.select().from(projects).where(eq(projects.organizationId, organizationId)).orderBy(asc(projects.createdAt)),
    organizationId === null ? context.db.select().from(products).where(isNull(products.organizationId)).orderBy(asc(products.createdAt)) : context.db.select().from(products).where(eq(products.organizationId, organizationId)).orderBy(asc(products.createdAt)),
    organizationId === null ? context.db.select().from(processes).where(isNull(processes.organizationId)).orderBy(asc(processes.createdAt)) : context.db.select().from(processes).where(eq(processes.organizationId, organizationId)).orderBy(asc(processes.createdAt)),
    context.db.select().from(hierarchyAttachments),
  ]);
  const attachmentFor = (type: ItemType, id: string) => attachments.find((item) => item.childType === type && item.childId === id);
  const direct = (type: ItemType, id: string) => { const attachment = attachmentFor(type, id); return attachment?.parentType === parentType && attachment.parentId === parentId; };
  const parentNames = await parentNamesByChild(context.db, attachments);
  const withParent = <T extends { id: string }>(type: ItemType, item: T) => { const attachment = attachmentFor(type, item.id); return { ...item, parentType: attachment?.parentType ?? null, parentId: attachment?.parentId ?? null, parentName: parentNames.get(`${type}:${item.id}`) ?? null }; };
  const visibleProjects = await Promise.all(projectRows.filter((item) => includesWorkStatus(parsed.filter, item.status) && direct("project", item.id)).map(async (item) => await canAccessProject(context.db, context.user.id, item.id, context.space.id, "view") ? item : null));
  const visibleProducts = await Promise.all(productRows.filter((item) => includesWorkStatus(parsed.filter, item.status) && direct("product", item.id)).map(async (item) => await canAccessProduct(context.db, context.user.id, item.id, context.space.id, "view") ? item : null));
  const visibleProcesses = await Promise.all(processRows.filter((item) => includesWorkStatus(parsed.filter, item.status) && direct("process", item.id)).map(async (item) => await canAccessProcess(context.db, context.user.id, item.id, context.space.id, "view") ? item : null));
  const visibleTasks = await Promise.all(taskRows.filter((item) => includesWorkStatus(parsed.filter, item.status) && direct("task", item.id)).map(async (item) => await canAccessTask(context.db, context.user.id, item.id, context.space.id, "view") ? item : null));
  return Response.json({
    departments: allDepartments.filter((item) => direct("department", item.id)).map((item) => withParent("department", item)),
    teams: allTeams.filter((item) => direct("team", item.id)).map((item) => withParent("team", item)),
    tasks: visibleTasks.filter((item): item is typeof taskRows[number] => item !== null).map((item) => ({ ...withParent("task", item), tags: [], checklistTotal: 0, checklistCompleted: 0 })),
    projects: visibleProjects.filter((item): item is typeof projectRows[number] => item !== null).map((item) => withParent("project", item)),
    products: visibleProducts.filter((item): item is typeof productRows[number] => item !== null).map((item) => ({ ...withParent("product", item), characteristics: (() => { try { const value = JSON.parse(item.characteristicsJson); return Array.isArray(value) ? value : []; } catch { return []; } })() })),
    processes: visibleProcesses.filter((item): item is typeof processRows[number] => item !== null).map((item) => withParent("process", item)),
    canCreate,
  });
}
