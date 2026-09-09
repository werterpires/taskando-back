import { and, eq } from "drizzle-orm";
import { recordApprovalDecision } from "../../../db/approval-audit";
import { canAccessPhase, canAccessProcess, canAccessProduct, canAccessProject, canAccessFront, canAccessTask, canItem } from "../../../db/authorization";
import { ensurePersonalContext } from "../../../db/current-user";
import { fronts, phases, processes, products, projects, tasks } from "../../../db/schema";

const subjectTypes = ["task", "project", "front", "product", "process", "phase"] as const;
type SubjectType = typeof subjectTypes[number];

const labels: Record<SubjectType, string> = { task: "a tarefa", project: "o projeto", front: "a frente", product: "o produto", process: "o processo", phase: "a Fase" };

export async function POST(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const payload = await request.json() as { subjectType?: string; subjectId?: string; decision?: string; reason?: string };
  const subjectType = payload.subjectType as SubjectType;
  const subjectId = payload.subjectId?.trim();
  if (!subjectTypes.includes(subjectType) || !subjectId) return Response.json({ error: "Item de aprovação inválido." }, { status: 400 });
  if (payload.decision !== "approve" && payload.decision !== "reject") return Response.json({ error: "Decisão inválida." }, { status: 400 });
  const reason = payload.reason?.trim() ?? "";
  if (payload.decision === "reject" && !reason) return Response.json({ error: "Informe o motivo da rejeição." }, { status: 400 });
  if (reason.length > 1000) return Response.json({ error: "O motivo deve ter até 1.000 caracteres." }, { status: 400 });

  let item: { id: string; title: string; status: string; approvalRequired: boolean; organizationId?: string | null; personalSpaceId?: string | null } | undefined;
  let canView = false;
  let canApprove = false;
  if (subjectType === "task") {
    const [row] = await context.db.select({ id: tasks.id, title: tasks.title, status: tasks.status, approvalRequired: tasks.approvalRequired, organizationId: tasks.organizationId, personalSpaceId: tasks.personalSpaceId, ownerUserId: tasks.ownerUserId }).from(tasks).where(and(eq(tasks.id, subjectId), eq(tasks.personalSpaceId, context.space.id))).limit(1);
    if (row) { item = row; canView = await canAccessTask(context.db, context.user.id, subjectId, context.space.id, "view"); canApprove = row.ownerUserId === context.user.id || await canItem(context.db, context.user.id, "task", subjectId, "approve"); }
  } else if (subjectType === "project") {
    const [row] = await context.db.select({ id: projects.id, title: projects.title, status: projects.status, approvalRequired: projects.approvalRequired, organizationId: projects.organizationId, personalSpaceId: projects.personalSpaceId, ownerUserId: projects.ownerUserId }).from(projects).where(eq(projects.id, subjectId)).limit(1);
    if (row) { item = row; canView = await canAccessProject(context.db, context.user.id, subjectId, context.space.id, "view"); canApprove = row.ownerUserId === context.user.id || await canItem(context.db, context.user.id, "project", subjectId, "approve"); }
  } else if (subjectType === "front") {
    const [row] = await context.db.select({ id: fronts.id, title: fronts.title, status: fronts.status, approvalRequired: fronts.approvalRequired, organizationId: fronts.organizationId, personalSpaceId: fronts.personalSpaceId, ownerUserId: fronts.ownerUserId }).from(fronts).where(eq(fronts.id, subjectId)).limit(1);
    if (row) { item = row; canView = await canAccessFront(context.db, context.user.id, subjectId, context.space.id, "view"); canApprove = row.ownerUserId === context.user.id || await canItem(context.db, context.user.id, "front", subjectId, "approve"); }
  } else if (subjectType === "product") {
    const [row] = await context.db.select({ id: products.id, title: products.title, status: products.status, approvalRequired: products.approvalRequired, organizationId: products.organizationId, personalSpaceId: products.personalSpaceId, ownerUserId: products.ownerUserId }).from(products).where(eq(products.id, subjectId)).limit(1);
    if (row) { item = row; canView = await canAccessProduct(context.db, context.user.id, subjectId, context.space.id, "view"); canApprove = row.ownerUserId === context.user.id || await canItem(context.db, context.user.id, "product", subjectId, "approve"); }
  } else if (subjectType === "process") {
    const [row] = await context.db.select({ id: processes.id, title: processes.title, status: processes.status, approvalRequired: processes.approvalRequired, organizationId: processes.organizationId, personalSpaceId: processes.personalSpaceId, ownerUserId: processes.ownerUserId }).from(processes).where(eq(processes.id, subjectId)).limit(1);
    if (row) { item = row; canView = await canAccessProcess(context.db, context.user.id, subjectId, context.space.id, "view"); canApprove = row.ownerUserId === context.user.id || await canItem(context.db, context.user.id, "process", subjectId, "approve"); }
  } else {
    const [row] = await context.db.select({ id: phases.id, title: phases.title, status: phases.status, approvalRequired: phases.approvalRequired, organizationId: phases.organizationId, personalSpaceId: phases.personalSpaceId, ownerUserId: phases.ownerUserId }).from(phases).where(eq(phases.id, subjectId)).limit(1);
    if (row) { item = row; canView = await canAccessPhase(context.db, context.user.id, subjectId, context.space.id, "view"); canApprove = row.ownerUserId === context.user.id || await canItem(context.db, context.user.id, "phase", subjectId, "approve"); }
  }
  if (!item || !canView) return Response.json({ error: `${labels[subjectType]} não encontrado.` }, { status: 404 });
  if (!item.approvalRequired || item.status !== "awaiting_approval") return Response.json({ error: `${labels[subjectType]} não está aguardando aprovação.` }, { status: 400 });
  if (!canApprove) return Response.json({ error: "Você não tem capacidade efetiva para aprovar este item." }, { status: 403 });

  const nextStatus = payload.decision === "approve" ? "completed" : "in_progress";
  const update = { status: nextStatus as "completed" | "in_progress", updatedAt: new Date().toISOString(), approvedAt: payload.decision === "approve" ? new Date().toISOString() : null, approvedByUserId: payload.decision === "approve" ? context.user.id : null };
  const table = subjectType === "task" ? tasks : subjectType === "project" ? projects : subjectType === "front" ? fronts : subjectType === "product" ? products : subjectType === "process" ? processes : phases;
  const [saved] = await context.db.update(table).set(update).where(eq(table.id, subjectId)).returning({ id: table.id, status: table.status, approvedAt: table.approvedAt, approvedByUserId: table.approvedByUserId });
  await recordApprovalDecision(context.db, { organizationId: item.organizationId, personalSpaceId: item.personalSpaceId, actorUserId: context.user.id, actorName: context.user.displayName, subjectType, subjectId, title: item.title, decision: payload.decision === "approve" ? "approved" : "rejected", reason });
  return Response.json({ subjectType, item: saved });
}
