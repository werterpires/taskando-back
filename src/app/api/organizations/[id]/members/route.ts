import { and, eq } from "drizzle-orm";
import { recordAuditEvent } from "../../../../../db/audit";
import { ensurePersonalContext } from "../../../../../db/current-user";
import { organizationMembers, organizations, users } from "../../../../../db/schema";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const roles = ["watcher", "contributor", "executor", "reviewer", "editor", "leader", "owner"] as const;
type OrganizationRole = typeof roles[number];

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  const [organization] = await context.db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  if (!organization) return Response.json({ error: "Organização não encontrada." }, { status: 404 });
  const isOwner = organization.ownerUserId === context.user.id;
  const [ownMembership] = await context.db.select({ id: organizationMembers.id, role: organizationMembers.role }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, id), eq(organizationMembers.email, context.user.email.toLowerCase()), eq(organizationMembers.status, "active"))).limit(1);
  if (!isOwner && !ownMembership) return Response.json({ error: "Você não tem acesso a esta organização." }, { status: 403 });
  const [[owner], rows] = await Promise.all([
    context.db.select({ id: users.id, email: users.email, displayName: users.displayName }).from(users).where(eq(users.id, organization.ownerUserId)).limit(1),
    context.db.select({ id: organizationMembers.id, userId: organizationMembers.userId, email: organizationMembers.email, status: organizationMembers.status, role: organizationMembers.role, createdAt: organizationMembers.createdAt, displayName: users.displayName }).from(organizationMembers).leftJoin(users, eq(organizationMembers.userId, users.id)).where(eq(organizationMembers.organizationId, id)),
  ]);
  const ownerIsRecorded = rows.some((member) => member.userId === organization.ownerUserId);
  const members = [
    ...(owner && !ownerIsRecorded ? [{ id: `owner-${organization.id}`, userId: owner.id, email: owner.email, status: "active" as const, role: "owner" as const, createdAt: organization.createdAt, displayName: owner.displayName, isOwner: true }] : []),
    ...rows.map((member) => ({ ...member, role: member.userId === organization.ownerUserId ? "owner" as const : member.role, displayName: member.displayName || member.email, isOwner: member.userId === organization.ownerUserId })),
  ];
  const currentRole: OrganizationRole = isOwner ? "owner" : ownMembership!.role as OrganizationRole;
  return Response.json({ members, capabilities: { currentRole, canAddMembers: currentRole === "owner" || currentRole === "leader", canEditMembers: currentRole === "owner", canViewAudit: currentRole === "owner" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  const [organization] = await context.db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  if (!organization) return Response.json({ error: "Organização não encontrada." }, { status: 404 });
  const isOwner = organization.ownerUserId === context.user.id;
  const [currentMembership] = await context.db.select({ role: organizationMembers.role }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, id), eq(organizationMembers.email, context.user.email.toLowerCase()), eq(organizationMembers.status, "active"))).limit(1);
  const canAddMembers = isOwner || currentMembership?.role === "leader";
  if (!canAddMembers) return Response.json({ error: "Seu papel não permite adicionar membros." }, { status: 403 });
  const payload = (await request.json()) as { email?: string; role?: OrganizationRole };
  const email = payload.email?.trim().toLowerCase() ?? "";
  if (!emailPattern.test(email)) return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
  if (email === context.user.email.toLowerCase()) return Response.json({ error: "Você já é o Owner desta organização." }, { status: 400 });
  if (payload.role && (!roles.includes(payload.role) || payload.role === "owner")) return Response.json({ error: "Papel inválido para um convite." }, { status: 400 });
  const role: OrganizationRole = isOwner ? (payload.role ?? "watcher") : "watcher";
  const [existing] = await context.db.select().from(organizationMembers).where(and(eq(organizationMembers.organizationId, id), eq(organizationMembers.email, email))).limit(1);
  if (existing?.status === "active") return Response.json({ error: "Essa pessoa já é membro ativo." }, { status: 409 });
  if (existing) {
    await context.db.update(organizationMembers).set({ status: "pending", role, updatedAt: new Date().toISOString() }).where(eq(organizationMembers.id, existing.id));
  } else {
    await context.db.insert(organizationMembers).values({ id: crypto.randomUUID(), organizationId: id, email, status: "pending", role });
  }
  await recordAuditEvent(context.db, {
    organizationId: id,
    actorUserId: context.user.id,
    actorName: context.user.displayName,
    action: existing ? "member_reinvited" : "member_invited",
    subjectType: "member",
    subjectId: existing?.id ?? email,
    summary: existing ? `reenviou o convite para ${email} como ${rolesInfoLabel(role)}.` : `convidou ${email} como ${rolesInfoLabel(role)}.`,
  });
  return Response.json({ message: "Convite criado." }, { status: 201 });
}

const rolesInfoLabel = (role: OrganizationRole) => role[0].toUpperCase() + role.slice(1);
