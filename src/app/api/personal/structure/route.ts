import { and, asc, eq, isNull } from "drizzle-orm";
import { ensurePersonalContext } from "../../../../db/current-user";
import { departments, hierarchyAttachments, teams } from "../../../../db/schema";

export async function GET() {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const [departmentItems, teamItems, attachments] = await Promise.all([
    context.db.select().from(departments).where(and(eq(departments.ownerUserId, context.user.id), isNull(departments.organizationId))).orderBy(asc(departments.name)),
    context.db.select().from(teams).where(and(eq(teams.ownerUserId, context.user.id), isNull(teams.organizationId))).orderBy(asc(teams.name)),
    context.db.select().from(hierarchyAttachments),
  ]);
  const childIds = new Set([...departmentItems.map((item) => `department:${item.id}`), ...teamItems.map((item) => `team:${item.id}`)]);
  const parentByChild = Object.fromEntries(attachments.filter((item) => childIds.has(`${item.childType}:${item.childId}`)).map((item) => [`${item.childType}:${item.childId}`, { parentType: item.parentType, parentId: item.parentId }]));
  return Response.json({ departments: departmentItems, teams: teamItems, parentByChild, canManage: true });
}

export async function POST(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const payload = (await request.json()) as { kind?: "department" | "team"; name?: string; description?: string; status?: "active" | "inactive"; parentType?: "department" | null; parentId?: string | null };
  const name = payload.name?.trim().replace(/\s+/g, " ") ?? "";
  const description = payload.description?.trim() ?? "";
  if ((payload.kind !== "department" && payload.kind !== "team") || !name || name.length > 100 || description.length > 500) return Response.json({ error: "Dados de estrutura inválidos." }, { status: 400 });
  const parentType = payload.parentType ?? null; const parentId = payload.parentId ?? null;
  if (payload.kind === "department" && parentType !== null) return Response.json({ error: "Departamento deve ser criado na Área pessoal." }, { status: 400 });
  if (payload.kind === "team" && parentType === "department") { const [parent] = await context.db.select().from(departments).where(and(eq(departments.id, parentId ?? ""), isNull(departments.organizationId), eq(departments.ownerUserId, context.user.id))).limit(1); if (!parent) return Response.json({ error: "Departamento pessoal inválido." }, { status: 400 }); }
  if (payload.kind === "team" && parentType !== null && parentType !== "department") return Response.json({ error: "Local do time inválido." }, { status: 400 });
  const table = payload.kind === "department" ? departments : teams;
  try {
    const [item] = await context.db.insert(table).values({ id: crypto.randomUUID(), organizationId: null, ownerUserId: context.user.id, name, description, status: payload.status ?? "active" }).returning();
    await context.db.insert(hierarchyAttachments).values({ id: crypto.randomUUID(), childType: payload.kind, childId: item.id, parentType, parentId });
    return Response.json({ item }, { status: 201 });
  } catch { return Response.json({ error: "Já existe um item com esse nome." }, { status: 409 }); }
}
