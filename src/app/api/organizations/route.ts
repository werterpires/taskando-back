import { and, eq } from "drizzle-orm";
import { recordAuditEvent } from "../../../db/audit";
import { ensurePersonalContext } from "../../../db/current-user";
import { organizationMembers, organizations } from "../../../db/schema";

export async function GET() {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const [owned, memberRows, invitationRows] = await Promise.all([
    context.db.select().from(organizations).where(eq(organizations.ownerUserId, context.user.id)),
    context.db.select({ organization: organizations }).from(organizationMembers).innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id)).where(and(eq(organizationMembers.email, context.user.email.toLowerCase()), eq(organizationMembers.status, "active"))),
    context.db.select({ id: organizationMembers.id, organization: organizations }).from(organizationMembers).innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id)).where(and(eq(organizationMembers.email, context.user.email.toLowerCase()), eq(organizationMembers.status, "pending"))),
  ]);
  const items = [...owned, ...memberRows.map((row) => row.organization)].filter((organization, index, all) => all.findIndex((item) => item.id === organization.id) === index).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return Response.json({ organizations: items, pendingInvitations: invitationRows });
}

export async function POST(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const payload = (await request.json()) as { name?: string; description?: string; icon?: string };
  const name = payload.name?.trim().replace(/\s+/g, " ") ?? "";
  const description = payload.description?.trim() ?? "";
  const icon = payload.icon?.trim().slice(0, 4) || "◈";
  if (!name) return Response.json({ error: "Informe o nome da organização." }, { status: 400 });
  if (name.length > 100 || description.length > 500) return Response.json({ error: "Use nome de até 100 e descrição de até 500 caracteres." }, { status: 400 });
  const [organization] = await context.db.insert(organizations).values({ id: crypto.randomUUID(), ownerUserId: context.user.id, name, description, icon, status: "active" }).returning();
  await context.db.insert(organizationMembers).values({ id: crypto.randomUUID(), organizationId: organization.id, userId: context.user.id, email: context.user.email.toLowerCase(), status: "active", role: "owner" });
  await recordAuditEvent(context.db, {
    organizationId: organization.id,
    actorUserId: context.user.id,
    actorName: context.user.displayName,
    action: "organization_created",
    subjectType: "organization",
    subjectId: organization.id,
    summary: `criou a organização “${organization.name}”.`,
  });
  return Response.json({ organization }, { status: 201 });
}
