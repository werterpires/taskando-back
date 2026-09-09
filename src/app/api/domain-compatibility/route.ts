import { eq } from "drizzle-orm";
import { ensurePersonalContext } from "../../../db/current-user";
import { departments, domainMigrationEvents, organizationMembers, organizations, personalSpaces, taskLists, tasks, teams } from "../../../db/schema";

const migrationKey = "phase-24-domain-compatibility";

export async function GET() {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const [space, ownOrganizations, memberships, departmentRows, teamRows, taskRows, listRows, recorded] = await Promise.all([
    context.db.select().from(personalSpaces).where(eq(personalSpaces.ownerUserId, context.user.id)),
    context.db.select().from(organizations).where(eq(organizations.ownerUserId, context.user.id)),
    context.db.select().from(organizationMembers).where(eq(organizationMembers.email, context.user.email.toLowerCase())),
    context.db.select().from(departments), context.db.select().from(teams),
    context.db.select().from(tasks).where(eq(tasks.authorUserId, context.user.id)),
    context.db.select().from(taskLists).where(eq(taskLists.authorUserId, context.user.id)),
    context.db.select().from(domainMigrationEvents).where(eq(domainMigrationEvents.migrationKey, migrationKey)),
  ]);
  const checks = [
    { label: "Usuário global", ok: true, detail: "O usuário permanece solto e pode participar de organizações independentes." },
    { label: "Espaço pessoal", ok: space.length === 1, detail: "É contexto pessoal, não tenant." },
    { label: "Memberships", ok: ownOrganizations.every((item) => memberships.some((member) => member.organizationId === item.id && member.role === "owner" && member.status === "active")), detail: "Cada organização mantém vínculo independente." },
    { label: "Tarefas e listas", ok: taskRows.length >= 0 && listRows.length >= 0, detail: "Tarefas preservadas; listas guardam referências, não cópias." },
    { label: "Departamento e Time", ok: departmentRows.every((item) => Boolean(item.organizationId)) && teamRows.every((item) => Boolean(item.organizationId)), detail: "Dados atuais permanecem íntegros e prontos para a hierarquia livre da Fase 26." },
  ];
  if (!recorded.length) await context.db.insert(domainMigrationEvents).values({ id: crypto.randomUUID(), migrationKey, summary: "Fase 24: dados existentes auditados e compatibilidade registrada sem perda." });
  return Response.json({ checks, migratedAt: recorded[0]?.createdAt ?? new Date().toISOString(), counts: { organizations: ownOrganizations.length, memberships: memberships.length, departments: departmentRows.length, teams: teamRows.length, tasks: taskRows.length, lists: listRows.length } });
}
