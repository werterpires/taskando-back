import { asc } from "drizzle-orm";
import { canAccessFront, canAccessOrganization, canAccessProject, canItem } from "../../../../db/authorization";
import { ensurePersonalContext } from "../../../../db/current-user";
import { departments, fronts, organizations, projects, teams } from "../../../../db/schema";

export async function GET() {
  const context = await ensurePersonalContext(); if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const [organizationRows, departmentRows, teamRows, projectRows, frontRows] = await Promise.all([context.db.select().from(organizations).orderBy(asc(organizations.name)), context.db.select().from(departments).orderBy(asc(departments.name)), context.db.select().from(teams).orderBy(asc(teams.name)), context.db.select().from(projects).orderBy(asc(projects.title)), context.db.select().from(fronts).orderBy(asc(fronts.title))]);
  const targets: { type: "organization" | "department" | "team" | "project" | "front"; id: string; name: string }[] = [];
  for (const item of organizationRows) if (await canAccessOrganization(context.db, context.user.id, context.user.email, item.id, "add_children")) targets.push({ type: "organization", id: item.id, name: item.name });
  for (const item of departmentRows) if (item.ownerUserId === context.user.id || await canItem(context.db, context.user.id, "department", item.id, "add_children")) targets.push({ type: "department", id: item.id, name: item.name });
  for (const item of teamRows) if (item.ownerUserId === context.user.id || await canItem(context.db, context.user.id, "team", item.id, "add_children")) targets.push({ type: "team", id: item.id, name: item.name });
  for (const item of projectRows) if (await canAccessProject(context.db, context.user.id, item.id, context.space.id, "add_children")) targets.push({ type: "project", id: item.id, name: item.title });
  for (const item of frontRows) if (await canAccessFront(context.db, context.user.id, item.id, context.space.id, "add_children")) targets.push({ type: "front", id: item.id, name: item.title });
  return Response.json({ targets });
}
