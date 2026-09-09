import { eq } from "drizzle-orm";
import { ensurePersonalContext } from "../../../../db/current-user";
import { organizations } from "../../../../db/schema";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  const [current] = await context.db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  if (!current) return Response.json({ error: "Organização não encontrada." }, { status: 404 });
  if (current.ownerUserId !== context.user.id) return Response.json({ error: "Somente o Owner pode editar a organização." }, { status: 403 });
  const payload = (await request.json()) as { name?: string; description?: string; icon?: string; status?: "active" | "inactive" };
  const name = payload.name?.trim().replace(/\s+/g, " ");
  const description = payload.description?.trim();
  const icon = payload.icon?.trim().slice(0, 4);
  if (name !== undefined && (!name || name.length > 100)) return Response.json({ error: "Informe um nome de até 100 caracteres." }, { status: 400 });
  if (description !== undefined && description.length > 500) return Response.json({ error: "Use descrição de até 500 caracteres." }, { status: 400 });
  if (payload.status !== undefined && payload.status !== "active" && payload.status !== "inactive") return Response.json({ error: "Status inválido." }, { status: 400 });
  if (name === undefined && description === undefined && icon === undefined && payload.status === undefined) return Response.json({ error: "Nenhuma alteração recebida." }, { status: 400 });
  const [organization] = await context.db.update(organizations).set({ ...(name !== undefined ? { name } : {}), ...(description !== undefined ? { description } : {}), ...(icon !== undefined ? { icon: icon || "◈" } : {}), ...(payload.status !== undefined ? { status: payload.status } : {}), updatedAt: new Date().toISOString() }).where(eq(organizations.id, id)).returning();
  return Response.json({ organization });
}
