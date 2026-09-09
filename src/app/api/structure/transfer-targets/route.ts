import { and, asc, eq, isNull, or } from "drizzle-orm";
import { ensurePersonalContext } from "../../../../db/current-user";
import { canAccessOrganization } from "../../../../db/authorization";
import { departments, organizations } from "../../../../db/schema";

export async function GET() {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const allOrganizations = await context.db.select().from(organizations).orderBy(asc(organizations.name));
  const allowedOrganizations = [] as { id: string; name: string }[];
  for (const organization of allOrganizations) if (await canAccessOrganization(context.db, context.user.id, context.user.email, organization.id, "edit")) allowedOrganizations.push({ id: organization.id, name: organization.name });
  const organizationIds = allowedOrganizations.map((item) => item.id);
  const departmentRows = await context.db.select().from(departments).where(or(isNull(departments.organizationId), ...(organizationIds.map((id) => eq(departments.organizationId, id))))).orderBy(asc(departments.name));
  const allowedDepartments = departmentRows.filter((department) => department.ownerUserId === context.user.id || (department.organizationId !== null && organizationIds.includes(department.organizationId))).map((department) => ({ id: department.id, name: department.name, organizationId: department.organizationId, organizationName: allowedOrganizations.find((organization) => organization.id === department.organizationId)?.name ?? "Área pessoal" }));
  return Response.json({ organizations: allowedOrganizations, departments: allowedDepartments });
}
