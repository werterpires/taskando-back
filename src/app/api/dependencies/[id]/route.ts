import { and, eq } from "drizzle-orm";
import { dependencyNode } from "../../../../db/dependencies";
import { ensurePersonalContext } from "../../../../db/current-user";
import { dependencyEdges } from "../../../../db/schema";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  const [edge] = await context.db.select().from(dependencyEdges).where(eq(dependencyEdges.id, id)).limit(1);
  if (!edge) return Response.json({ error: "Dependência não encontrada." }, { status: 404 });
  const [predecessor, successor] = await Promise.all([dependencyNode(context, edge.predecessorType, edge.predecessorId, "interact"), dependencyNode(context, edge.successorType, edge.successorId, "interact")]);
  if (!predecessor || !successor) return Response.json({ error: "Você não tem permissão para remover esta dependência." }, { status: 403 });
  await context.db.delete(dependencyEdges).where(and(eq(dependencyEdges.id, id), eq(dependencyEdges.predecessorId, edge.predecessorId)));
  return Response.json({ ok: true });
}
