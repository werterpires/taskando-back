import { and, eq, isNull } from "drizzle-orm";
import { canAccessFront, canAccessPhase, canAccessProcess, canAccessProduct, canAccessProject, canAccessTask } from "../../../db/authorization";
import { ensurePersonalContext } from "../../../db/current-user";
import { fronts, organizationMembers, organizations, phases, processes, products, projects, tasks } from "../../../db/schema";
import { includesWorkStatus, parseWorkStatusFilter } from "../../../db/work-status-filter";

type Kind = "project" | "front" | "product" | "process" | "phase" | "task";
type Row = { id: string; title: string; description: string; status: string; importance: string | null; urgency: string | null; organizationId: string | null; ownerUserId: string | null; parentName: string | null; kind: Kind };

export async function GET(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const parsed = parseWorkStatusFilter(request);
  if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 });
  const [orgs, projectsRows, frontsRows, productsRows, processesRows, phasesRows, tasksRows, members, ownedOrganizations] = await Promise.all([
    context.db.select({ id: organizations.id, name: organizations.name }).from(organizations),
    context.db.select().from(projects), context.db.select().from(fronts), context.db.select().from(products),
    context.db.select().from(processes), context.db.select().from(phases), context.db.select().from(tasks).where(and(isNull(tasks.parentTaskId), isNull(tasks.deletedAt))),
    context.db.select({ organizationId: organizationMembers.organizationId }).from(organizationMembers).where(and(eq(organizationMembers.email, context.user.email.toLowerCase()), eq(organizationMembers.status, "active"))),
    context.db.select({ organizationId: organizations.id }).from(organizations).where(eq(organizations.ownerUserId, context.user.id)),
  ]);
  const orgNames = new Map(orgs.map((org) => [org.id, org.name]));
  const visible = async <T extends { id: string; title: string; description: string; status: string; importance: string | null; urgency: string | null; organizationId: string | null; ownerUserId?: string | null }>(rows: T[], kind: Kind, check: (id: string) => Promise<boolean>) => {
    const allowed = await Promise.all(rows.map(async (item) => await check(item.id) ? item : null));
    return allowed.filter((item): item is Awaited<T> => item !== null).map((item) => ({ ...item, kind, ownerUserId: item.ownerUserId ?? null, parentName: null } as Row));
  };
  const [projectRows, frontRows, productRows, processRows, phaseRows, taskRows] = await Promise.all([
    visible(projectsRows.filter((item) => includesWorkStatus(parsed.filter, item.status)), "project", (id) => canAccessProject(context.db, context.user.id, id, context.space.id, "view")),
    visible(frontsRows.filter((item) => includesWorkStatus(parsed.filter, item.status)), "front", (id) => canAccessFront(context.db, context.user.id, id, context.space.id, "view")),
    visible(productsRows.filter((item) => includesWorkStatus(parsed.filter, item.status)), "product", (id) => canAccessProduct(context.db, context.user.id, id, context.space.id, "view")),
    visible(processesRows.filter((item) => includesWorkStatus(parsed.filter, item.status)), "process", (id) => canAccessProcess(context.db, context.user.id, id, context.space.id, "view")),
    visible(phasesRows.filter((item) => includesWorkStatus(parsed.filter, item.status)), "phase", (id) => canAccessPhase(context.db, context.user.id, id, context.space.id, "view")),
    visible(tasksRows.filter((item) => includesWorkStatus(parsed.filter, item.status)), "task", (id) => canAccessTask(context.db, context.user.id, id, context.space.id, "view")),
  ]);
  const items = [...projectRows, ...frontRows, ...productRows, ...processRows, ...phaseRows, ...taskRows].map((item) => ({ ...item, contextKey: item.organizationId ? `organization:${item.organizationId}` : "personal", contextName: item.organizationId ? (orgNames.get(item.organizationId) ?? "Organização") : "Área pessoal", typeLabel: { project: "Projeto", front: "Frente", product: "Produto", process: "Processo", phase: "Fase", task: "Tarefa" }[item.kind] }));
  const contextIds = [...new Set([...members, ...ownedOrganizations].map((member) => member.organizationId))];
  return Response.json({ items, contexts: [{ key: "personal", label: "Área pessoal" }, ...contextIds.map((organizationId) => ({ key: `organization:${organizationId}`, label: orgNames.get(organizationId) ?? "Organização" }))] });
}
