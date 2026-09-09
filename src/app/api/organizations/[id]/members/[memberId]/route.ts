import { and, eq } from "drizzle-orm";
import { recordAuditEvent } from "../../../../../../db/audit";
import { ensurePersonalContext } from "../../../../../../db/current-user";
import { organizationMembers, organizations } from "../../../../../../db/schema";

const roles = ["watcher", "contributor", "executor", "reviewer", "editor", "leader", "owner"] as const;
type OrganizationRole = typeof roles[number];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { id, memberId } = await params;
  const payload = (await request.json()) as { status?: "pending" | "active" | "removed"; role?: OrganizationRole };
  if (!payload.status && !payload.role) return Response.json({ error: "Informe uma alteração." }, { status: 400 });
  if (payload.status && !["pending", "active", "removed"].includes(payload.status)) return Response.json({ error: "Status inválido." }, { status: 400 });
  if (payload.role && (!roles.includes(payload.role) || payload.role === "owner")) return Response.json({ error: "Papel inválido." }, { status: 400 });
  const [organization] = await context.db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  const [member] = await context.db.select().from(organizationMembers).where(and(eq(organizationMembers.id, memberId), eq(organizationMembers.organizationId, id))).limit(1);
  if (!organization || !member) return Response.json({ error: "Membro ou organização não encontrado." }, { status: 404 });
  const isOwner = organization.ownerUserId === context.user.id;
  const isInvitee = member.email === context.user.email.toLowerCase();
  if (payload.status === "active" && !payload.role && isInvitee && member.status === "pending") {
    await context.db.update(organizationMembers).set({ status: "active", userId: context.user.id, updatedAt: new Date().toISOString() }).where(eq(organizationMembers.id, member.id));
    await recordAuditEvent(context.db, {
      organizationId: id,
      actorUserId: context.user.id,
      actorName: context.user.displayName,
      action: "member_accepted",
      subjectType: "member",
      subjectId: member.id,
      summary: `aceitou o convite para entrar na organização.`,
    });
    return Response.json({ message: "Convite aceito." });
  }
  if (!isOwner) return Response.json({ error: "Somente o Owner pode alterar este membro." }, { status: 403 });
  if (member.userId === organization.ownerUserId) return Response.json({ error: "O Owner não pode ser removido." }, { status: 400 });
  await context.db.update(organizationMembers).set({ ...(payload.status ? { status: payload.status } : {}), ...(payload.role ? { role: payload.role } : {}), updatedAt: new Date().toISOString() }).where(eq(organizationMembers.id, member.id));
  if (payload.role && payload.role !== member.role) {
    await recordAuditEvent(context.db, {
      organizationId: id,
      actorUserId: context.user.id,
      actorName: context.user.displayName,
      action: "member_role_changed",
      subjectType: "member",
      subjectId: member.id,
      summary: `alterou o papel de ${member.email} de ${roleLabel(member.role as OrganizationRole)} para ${roleLabel(payload.role)}.`,
    });
  }
  if (payload.status && payload.status !== member.status) {
    const action = payload.status === "removed" ? "member_removed" : "member_reinvited";
    await recordAuditEvent(context.db, {
      organizationId: id,
      actorUserId: context.user.id,
      actorName: context.user.displayName,
      action,
      subjectType: "member",
      subjectId: member.id,
      summary: payload.status === "removed" ? `removeu ${member.email} da organização.` : `reenviou o convite para ${member.email}.`,
    });
  }
  return Response.json({ message: "Membro atualizado." });
}

const roleLabel = (role: OrganizationRole) => role[0].toUpperCase() + role.slice(1);
