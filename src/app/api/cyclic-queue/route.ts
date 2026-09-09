import { eq } from "drizzle-orm";
import { canAccessTask } from "../../../db/authorization";
import { recordAuditEvent } from "../../../db/audit";
import { adjustCyclicQueue, listCyclicQueue, type CyclicAdjustmentMode } from "../../../db/cyclic";
import { ensurePersonalContext } from "../../../db/current-user";
import { tasks } from "../../../db/schema";

const adjustmentModes: CyclicAdjustmentMode[] = ["until_completion", "relevance", "persistent", "algorithm"];

export async function GET() {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const queue = await listCyclicQueue(context.db, context.space.id);
  const visible = await Promise.all(queue.tasks.map(async (task) => await canAccessTask(context.db, context.user.id, task.id, context.space.id, "view") ? task : null));
  return Response.json({ ...queue, tasks: visible.filter((task): task is typeof queue.tasks[number] => task !== null) });
}

export async function PATCH(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const payload = await request.json() as { taskId?: string; position?: number; mode?: CyclicAdjustmentMode; relevance?: number | null; expectedRevision?: number };
  if (!payload.taskId || !Number.isInteger(payload.position) || !payload.mode || !adjustmentModes.includes(payload.mode)) return Response.json({ error: "Informe tarefa, posição e uma precedência de ajuste válida." }, { status: 400 });
  if (!await canAccessTask(context.db, context.user.id, payload.taskId, context.space.id, "edit")) return Response.json({ error: "Você não pode ajustar esta Cíclica." }, { status: 403 });
  const [task] = await context.db.select({ id: tasks.id, taskType: tasks.taskType, personalSpaceId: tasks.personalSpaceId }).from(tasks).where(eq(tasks.id, payload.taskId)).limit(1);
  if (!task || task.taskType !== "cyclic" || task.personalSpaceId !== context.space.id) return Response.json({ error: "Cíclica não encontrada." }, { status: 404 });
  const result = await adjustCyclicQueue(context.db, { personalSpaceId: context.space.id, taskId: payload.taskId, position: payload.position!, mode: payload.mode, relevance: payload.relevance, userId: context.user.id, expectedRevision: payload.expectedRevision });
  if (!("tasks" in result)) return Response.json({ error: result.error, conflict: result.conflict ?? false }, { status: result.conflict ? 409 : 400 });
  const adjusted = result.tasks.find((item) => item.id === payload.taskId);
  if (adjusted) await recordAuditEvent(context.db, { personalSpaceId: context.space.id, actorUserId: context.user.id, actorName: context.user.displayName, action: "cyclic_queue_adjusted", subjectType: "task", subjectId: adjusted.id, summary: `ajustou a Cíclica “${adjusted.title}” para a posição ${adjusted.queuePosition} com a precedência “${payload.mode}”.${payload.mode === "relevance" ? ` Novo nível: ${adjusted.relevance ?? 3}.` : ""}` });
  return Response.json(result);
}
