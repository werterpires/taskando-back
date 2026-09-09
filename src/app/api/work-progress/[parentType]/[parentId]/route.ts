import { and, eq, inArray, isNull } from "drizzle-orm";
import { canAccessFront, canAccessPhase, canAccessProcess, canAccessProduct, canAccessProject, canAccessTask } from "../../../../../db/authorization";
import { ensurePersonalContext } from "../../../../../db/current-user";
import { fronts, hierarchyAttachments, phases, processes, products, projects, tasks } from "../../../../../db/schema";

const parentTypes = ["project", "front", "product", "process", "phase"] as const;
type ParentType = typeof parentTypes[number];
type ChildType = "front" | "product" | "process" | "phase" | "task";
type Child = { type: ChildType; id: string; status: string };

const childTypesByParent: Record<ParentType, ChildType[]> = {
  project: ["front", "product", "process", "task"],
  front: ["product", "process", "task"],
  product: ["process", "task"],
  process: ["phase", "task"],
  phase: ["task"],
};

export async function GET(_: Request, { params }: { params: Promise<{ parentType: string; parentId: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { parentType, parentId } = await params;
  if (!parentTypes.includes(parentType as ParentType)) return Response.json({ error: "Contêiner inválido." }, { status: 400 });

  const type = parentType as ParentType;
  const parentAccess = type === "project"
    ? await canAccessProject(context.db, context.user.id, parentId, context.space.id, "view_children")
    : type === "front"
      ? await canAccessFront(context.db, context.user.id, parentId, context.space.id, "view_children")
      : type === "product"
        ? await canAccessProduct(context.db, context.user.id, parentId, context.space.id, "view_children")
        : type === "process"
          ? await canAccessProcess(context.db, context.user.id, parentId, context.space.id, "view_children")
          : await canAccessPhase(context.db, context.user.id, parentId, context.space.id, "view_children");
  if (!parentAccess) return Response.json({ error: "Você não tem acesso a este contêiner." }, { status: 403 });

  const allowedChildTypes = childTypesByParent[type];
  const attachments = await context.db.select({ childType: hierarchyAttachments.childType, childId: hierarchyAttachments.childId })
    .from(hierarchyAttachments)
    .where(and(eq(hierarchyAttachments.parentType, type), eq(hierarchyAttachments.parentId, parentId)));
  const idsByType = new Map<ChildType, string[]>();
  for (const childType of allowedChildTypes) idsByType.set(childType, attachments.filter((item) => item.childType === childType).map((item) => item.childId));

  const [frontRows, productRows, processRows, phaseRows, taskRows] = await Promise.all([
    idsByType.get("front")?.length ? context.db.select({ id: fronts.id, status: fronts.status }).from(fronts).where(inArray(fronts.id, idsByType.get("front")!)) : Promise.resolve([]),
    idsByType.get("product")?.length ? context.db.select({ id: products.id, status: products.status }).from(products).where(inArray(products.id, idsByType.get("product")!)) : Promise.resolve([]),
    idsByType.get("process")?.length ? context.db.select({ id: processes.id, status: processes.status }).from(processes).where(inArray(processes.id, idsByType.get("process")!)) : Promise.resolve([]),
    idsByType.get("phase")?.length ? context.db.select({ id: phases.id, status: phases.status }).from(phases).where(inArray(phases.id, idsByType.get("phase")!)) : Promise.resolve([]),
    idsByType.get("task")?.length ? context.db.select({ id: tasks.id, status: tasks.status }).from(tasks).where(and(inArray(tasks.id, idsByType.get("task")!), isNull(tasks.deletedAt))) : Promise.resolve([]),
  ]);

  const candidates: Child[] = [
    ...frontRows.map((item) => ({ ...item, type: "front" as const })),
    ...productRows.map((item) => ({ ...item, type: "product" as const })),
    ...processRows.map((item) => ({ ...item, type: "process" as const })),
    ...phaseRows.map((item) => ({ ...item, type: "phase" as const })),
    ...taskRows.map((item) => ({ ...item, type: "task" as const })),
  ];
  const visible = (await Promise.all(candidates.map(async (child) => {
    const allowed = child.type === "front"
      ? await canAccessFront(context.db, context.user.id, child.id, context.space.id)
      : child.type === "product"
        ? await canAccessProduct(context.db, context.user.id, child.id, context.space.id)
        : child.type === "process"
          ? await canAccessProcess(context.db, context.user.id, child.id, context.space.id)
          : child.type === "phase"
            ? await canAccessPhase(context.db, context.user.id, child.id, context.space.id)
            : await canAccessTask(context.db, context.user.id, child.id, context.space.id, "view");
    return allowed ? child : null;
  }))).filter((child): child is Child => child !== null);

  const excluded = visible.filter((child) => child.status === "cancelled" || child.status === "archived").length;
  const total = visible.length - excluded;
  const completed = visible.filter((child) => child.status === "completed").length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  return Response.json({ percentage, completed, total, excluded, visible: visible.length });
}
