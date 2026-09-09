import { and, eq } from "drizzle-orm";
import { ensurePersonalContext } from "../../../db/current-user";
import { departments, fronts, itemInvitations, itemRoleAssignments, phases, processes, products, projects, tasks, teams } from "../../../db/schema";

const labelFor = (type: "department" | "team" | "project" | "front" | "product" | "process" | "phase" | "task") => type === "department" ? "Departamento" : type === "team" ? "Time" : type === "project" ? "Projeto" : type === "front" ? "Frente" : type === "product" ? "Produto" : type === "process" ? "Processo" : type === "phase" ? "Fase" : "Tarefa";

export async function GET() {
  const context = await ensurePersonalContext(); if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const invitations = await context.db.select().from(itemInvitations).where(eq(itemInvitations.email, context.user.email.toLowerCase()));
  const items = await Promise.all(invitations.filter((invite) => invite.status !== "removed").map(async (invite) => {
    const table = invite.itemType === "department" ? departments : invite.itemType === "team" ? teams : invite.itemType === "project" ? projects : invite.itemType === "front" ? fronts : invite.itemType === "product" ? products : invite.itemType === "process" ? processes : invite.itemType === "phase" ? phases : tasks;
    const [item] = await context.db.select().from(table).where(eq(table.id, invite.itemId)).limit(1);
    if (!item) return null;
    return { id: invite.id, itemId: invite.itemId, itemType: invite.itemType, itemName: "title" in item ? item.title : item.name, organizationId: item.organizationId, role: invite.role, status: invite.status };
  }));
  return Response.json({ invitations: items.filter((item): item is NonNullable<typeof item> => Boolean(item)) });
}

export async function PATCH(request: Request) {
  const context = await ensurePersonalContext(); if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { invitationId, accept } = await request.json() as { invitationId?: string; accept?: boolean };
  if (!invitationId || typeof accept !== "boolean") return Response.json({ error: "Convite inválido." }, { status: 400 });
  const [invitation] = await context.db.select().from(itemInvitations).where(and(eq(itemInvitations.id, invitationId), eq(itemInvitations.email, context.user.email.toLowerCase()), eq(itemInvitations.status, "pending"))).limit(1);
  if (!invitation) return Response.json({ error: "Convite não encontrado." }, { status: 404 });
  const now = new Date().toISOString();
  if (accept) await context.db.insert(itemRoleAssignments).values({ id: crypto.randomUUID(), itemType: invitation.itemType, itemId: invitation.itemId, userId: context.user.id, role: invitation.role }).onConflictDoNothing();
  await context.db.update(itemInvitations).set({ status: accept ? "active" : "removed", userId: accept ? context.user.id : null, updatedAt: now }).where(eq(itemInvitations.id, invitation.id));
  return Response.json({ status: accept ? "active" : "removed", message: accept ? `Convite para ${labelFor(invitation.itemType)} aceito.` : "Convite recusado." });
}
