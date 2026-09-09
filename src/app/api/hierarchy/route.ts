import { and, eq } from "drizzle-orm";
import { ensurePersonalContext } from "../../../db/current-user";
import { hierarchyAttachments } from "../../../db/schema";
import { hierarchyChildTypes, hierarchyParentTypes, validateAttachment, type HierarchyChildType, type HierarchyType } from "../../../db/hierarchy";

const types = new Set<HierarchyType>([...hierarchyParentTypes]);
export async function POST(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const body = await request.json() as { childType?: HierarchyType; childId?: string; parentType?: HierarchyType | null; parentId?: string | null };
  if (!body.childType || !body.childId || !hierarchyChildTypes.has(body.childType as HierarchyChildType) || (body.parentType && !types.has(body.parentType))) return Response.json({ error: "Hierarquia inválida." }, { status: 400 });
  const childType = body.childType as HierarchyChildType;
  const parentType = (body.parentType ?? null) as typeof hierarchyAttachments.$inferInsert.parentType;
  const error = validateAttachment(childType, body.childId, parentType, body.parentId);
  if (error) return Response.json({ error }, { status: 400 });
  const [item] = await context.db.insert(hierarchyAttachments).values({ id: crypto.randomUUID(), childType, childId: body.childId, parentType, parentId: body.parentId ?? null, updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: [hierarchyAttachments.childType, hierarchyAttachments.childId], set: { parentType, parentId: body.parentId ?? null, updatedAt: new Date().toISOString() } }).returning();
  return Response.json({ attachment: item });
}
export async function GET(request: Request) {
  const context = await ensurePersonalContext(); if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const childType = new URL(request.url).searchParams.get("childType") as HierarchyChildType | null; const childId = new URL(request.url).searchParams.get("childId");
  if (!childType || !hierarchyChildTypes.has(childType) || !childId) return Response.json({ error: "Informe childType e childId válidos." }, { status: 400 });
  const [attachment] = await context.db.select().from(hierarchyAttachments).where(and(eq(hierarchyAttachments.childType, childType), eq(hierarchyAttachments.childId, childId))).limit(1);
  return Response.json({ attachment: attachment ?? null });
}
