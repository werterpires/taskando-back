import { asc, eq } from "drizzle-orm";
import { canAccessOrganization, canItem } from "../../../../db/authorization";
import { ensurePersonalContext } from "../../../../db/current-user";
import { departments, organizations, teams } from "../../../../db/schema";

export async function GET() {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const [allOrganizations, allDepartments, allTeams] = await Promise.all([context.db.select().from(organizations).orderBy(asc(organizations.name)), context.db.select().from(departments).orderBy(asc(departments.name)), context.db.select().from(teams).orderBy(asc(teams.name))]);
  const targets: { type: "organization" | "department" | "team"; id: string; name: string }[] = [];
  for (const organization of allOrganizations) if (await canAccessOrganization(context.db, context.user.id, context.user.email, organization.id, "add_children")) targets.push({ type: "organization", id: organization.id, name: organization.name });
  for (const item of allDepartments) if (item.ownerUserId === context.user.id || await canItem(context.db, context.user.id, "department", item.id, "add_children") || (item.organizationId !== null && await canAccessOrganization(context.db, context.user.id, context.user.email, item.organizationId, "add_children"))) targets.push({ type: "department", id: item.id, name: item.name });
  for (const item of allTeams) if (item.ownerUserId === context.user.id || await canItem(context.db, context.user.id, "team", item.id, "add_children") || (item.organizationId !== null && await canAccessOrganization(context.db, context.user.id, context.user.email, item.organizationId, "add_children"))) targets.push({ type: "team", id: item.id, name: item.name });
  return Response.json({ targets });
}
