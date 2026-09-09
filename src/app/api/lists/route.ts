import { and, asc, eq } from "drizzle-orm";
import { canAccessTask } from "../../../db/authorization";
import { ensurePersonalContext } from "../../../db/current-user";
import { taskListTasks, taskLists } from "../../../db/schema";

export async function GET() {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const lists = await context.db.select().from(taskLists).where(eq(taskLists.personalSpaceId, context.space.id)).orderBy(asc(taskLists.name));
  const memberships = await context.db.select({ listId: taskListTasks.listId, taskId: taskListTasks.taskId }).from(taskListTasks).innerJoin(taskLists, eq(taskListTasks.listId, taskLists.id)).where(eq(taskLists.personalSpaceId, context.space.id));
  const visibility = await Promise.all(memberships.map(async (membership) => ({ membership, accessible: await canAccessTask(context.db, context.user.id, membership.taskId, context.space.id, "view") })));
  const inaccessible = visibility.filter((item) => !item.accessible).map((item) => item.membership);
  await Promise.all(inaccessible.map((membership) => context.db.delete(taskListTasks).where(and(eq(taskListTasks.listId, membership.listId), eq(taskListTasks.taskId, membership.taskId)))));
  const taskIdsByList = new Map<string, string[]>();
  for (const { membership, accessible } of visibility) if (accessible) taskIdsByList.set(membership.listId, [...(taskIdsByList.get(membership.listId) ?? []), membership.taskId]);
  return Response.json({ lists: lists.map((list) => ({ ...list, taskIds: taskIdsByList.get(list.id) ?? [] })) });
}

export async function POST(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const payload = (await request.json()) as { name?: string; copyFromId?: string };
  if (payload.copyFromId) {
    const [source] = await context.db.select().from(taskLists).where(and(eq(taskLists.id, payload.copyFromId), eq(taskLists.personalSpaceId, context.space.id))).limit(1);
    if (!source) return Response.json({ error: "Lista não encontrada." }, { status: 404 });
    const ownLists = await context.db.select({ name: taskLists.name }).from(taskLists).where(eq(taskLists.personalSpaceId, context.space.id));
    const names = new Set(ownLists.map((list) => list.name));
    const baseName = `Cópia de ${source.name}`.slice(0, 80);
    let name = baseName; let suffix = 2;
    while (names.has(name)) { name = `${baseName.slice(0, 75)} (${suffix})`; suffix += 1; }
    const [list] = await context.db.insert(taskLists).values({ id: crypto.randomUUID(), personalSpaceId: context.space.id, authorUserId: context.user.id, name }).returning();
    const memberships = await context.db.select({ taskId: taskListTasks.taskId }).from(taskListTasks).where(eq(taskListTasks.listId, source.id));
    const visible = await Promise.all(memberships.map(async ({ taskId }) => await canAccessTask(context.db, context.user.id, taskId, context.space.id, "view") ? taskId : null));
    const taskIds = visible.filter((taskId): taskId is string => taskId !== null);
    for (const taskId of taskIds) await context.db.insert(taskListTasks).values({ listId: list.id, taskId }).onConflictDoNothing();
    return Response.json({ list: { ...list, taskIds } }, { status: 201 });
  }
  const name = payload.name?.trim().replace(/\s+/g, " ") ?? "";
  if (!name) return Response.json({ error: "Informe o nome da lista." }, { status: 400 });
  if (name.length > 80) return Response.json({ error: "Use um nome de até 80 caracteres." }, { status: 400 });
  try {
    const [list] = await context.db.insert(taskLists).values({ id: crypto.randomUUID(), personalSpaceId: context.space.id, authorUserId: context.user.id, name }).returning();
    return Response.json({ list: { ...list, taskIds: [] } }, { status: 201 });
  } catch {
    return Response.json({ error: "Já existe uma lista com este nome." }, { status: 409 });
  }
}
