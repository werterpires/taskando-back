import { and, eq } from "drizzle-orm";
import { ensurePersonalContext } from "../../../../../../db/current-user";
import { taskListTasks, taskLists } from "../../../../../../db/schema";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { id, taskId } = await params;
  const [list] = await context.db.select({ id: taskLists.id }).from(taskLists).where(and(eq(taskLists.id, id), eq(taskLists.personalSpaceId, context.space.id))).limit(1);
  if (!list) return Response.json({ error: "Lista não encontrada." }, { status: 404 });
  await context.db.delete(taskListTasks).where(and(eq(taskListTasks.listId, id), eq(taskListTasks.taskId, taskId)));
  return Response.json({ taskId });
}
