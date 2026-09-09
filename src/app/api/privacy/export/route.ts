import { and, eq, or } from "drizzle-orm";
import { ensurePersonalContext } from "../../../../db/current-user";
import { takeRateLimit } from "../../../../db/rate-limit";
import { auditEvents, departments, fronts, hierarchyAttachments, itemInvitations, itemRoleAssignments, itemTemplates, notificationPreferences, notifications, organizationMembers, organizations, ownerTransferRequests, personalSpaces, phases, processes, products, projects, recurrenceExceptions, recurrenceOccurrences, recurrenceSeries, reminders, taskAssignees, taskComments, taskListTasks, taskLists, tasks, teams, users } from "../../../../db/schema";

export async function GET() {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const rate = takeRateLimit(`privacy-export:${context.user.id}`, 5, 15 * 60 * 1000);
  if (!rate.allowed) return Response.json({ error: "Muitas exportações em pouco tempo. Tente novamente mais tarde." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  try {
    const userId = context.user.id;
    const [user, space, memberships, ownedOrganizations, departmentsRows, teamsRows, projectsRows, frontsRows, productsRows, processesRows, phasesRows, tasksRows, comments, remindersRows, templates, roles, assignments, lists, listTasks, invitations, preferences, userNotifications, transfers, series, occurrences, exceptions, audit] = await Promise.all([
      context.db.select({ id: users.id, email: users.email, displayName: users.displayName, createdAt: users.createdAt, updatedAt: users.updatedAt }).from(users).where(eq(users.id, userId)).limit(1),
      context.db.select().from(personalSpaces).where(eq(personalSpaces.id, context.space.id)).limit(1),
      context.db.select().from(organizationMembers).where(or(eq(organizationMembers.userId, userId), eq(organizationMembers.email, context.user.email))),
      context.db.select().from(organizations).where(eq(organizations.ownerUserId, userId)),
      context.db.select().from(departments).where(eq(departments.ownerUserId, userId)),
      context.db.select().from(teams).where(eq(teams.ownerUserId, userId)),
      context.db.select().from(projects).where(or(eq(projects.ownerUserId, userId), eq(projects.authorUserId, userId))),
      context.db.select().from(fronts).where(or(eq(fronts.ownerUserId, userId), eq(fronts.authorUserId, userId))),
      context.db.select().from(products).where(or(eq(products.ownerUserId, userId), eq(products.authorUserId, userId))),
      context.db.select().from(processes).where(or(eq(processes.ownerUserId, userId), eq(processes.authorUserId, userId))),
      context.db.select().from(phases).where(or(eq(phases.ownerUserId, userId), eq(phases.authorUserId, userId))),
      context.db.select().from(tasks).where(or(eq(tasks.ownerUserId, userId), eq(tasks.authorUserId, userId))),
      context.db.select().from(taskComments).where(eq(taskComments.authorUserId, userId)),
      context.db.select().from(reminders).where(eq(reminders.ownerUserId, userId)),
      context.db.select().from(itemTemplates).where(eq(itemTemplates.authorUserId, userId)),
      context.db.select().from(itemRoleAssignments).where(eq(itemRoleAssignments.userId, userId)),
      context.db.select().from(taskAssignees).where(eq(taskAssignees.userId, userId)),
      context.db.select().from(taskLists).where(eq(taskLists.personalSpaceId, context.space.id)),
      context.db.select().from(taskListTasks).innerJoin(taskLists, eq(taskListTasks.listId, taskLists.id)).where(eq(taskLists.personalSpaceId, context.space.id)),
      context.db.select().from(itemInvitations).where(or(eq(itemInvitations.userId, userId), eq(itemInvitations.email, context.user.email))),
      context.db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)),
      context.db.select().from(notifications).where(eq(notifications.recipientUserId, userId)),
      context.db.select().from(ownerTransferRequests).where(or(eq(ownerTransferRequests.currentOwnerUserId, userId), eq(ownerTransferRequests.proposedOwnerUserId, userId), eq(ownerTransferRequests.requestedByUserId, userId))),
      context.db.select().from(recurrenceSeries).where(or(eq(recurrenceSeries.ownerUserId, userId), eq(recurrenceSeries.authorUserId, userId))),
      context.db.select().from(recurrenceOccurrences).innerJoin(recurrenceSeries, eq(recurrenceOccurrences.seriesId, recurrenceSeries.id)).where(or(eq(recurrenceSeries.ownerUserId, userId), eq(recurrenceSeries.authorUserId, userId))),
      context.db.select().from(recurrenceExceptions).where(eq(recurrenceExceptions.createdByUserId, userId)),
      context.db.select().from(auditEvents).where(eq(auditEvents.actorUserId, userId)),
    ]);
    const ownedItemIds = new Set([
      ...projectsRows.map((item) => `project:${item.id}`), ...frontsRows.map((item) => `front:${item.id}`), ...productsRows.map((item) => `product:${item.id}`),
      ...processesRows.map((item) => `process:${item.id}`), ...phasesRows.map((item) => `phase:${item.id}`), ...tasksRows.map((item) => `task:${item.id}`),
    ]);
    const attachments = await context.db.select().from(hierarchyAttachments);
    const privateAttachments = attachments.filter((item) => ownedItemIds.has(`${item.childType}:${item.childId}`));
    return new Response(JSON.stringify({
      exportedAt: new Date().toISOString(),
      formatVersion: 1,
      scope: "Dados pessoais do usuário, itens próprios/autoriais e relações necessárias; dados de outros membros não são incluídos.",
      user: user[0] ?? null,
      personalSpace: space[0] ?? null,
      organizations: ownedOrganizations,
      memberships,
      structure: { departments: departmentsRows, teams: teamsRows, projects: projectsRows, fronts: frontsRows, products: productsRows, processes: processesRows, phases: phasesRows },
      tasks: tasksRows,
      comments,
      reminders: remindersRows,
      templates,
      roles,
      assignments,
      lists,
      listTasks,
      invitations,
      notificationPreferences: preferences,
      notifications: userNotifications,
      ownerTransfers: transfers,
      recurrence: { series, occurrences, exceptions },
      hierarchyAttachments: privateAttachments,
      auditEvents: audit,
    }, null, 2), { status: 200, headers: { "content-type": "application/json; charset=utf-8", "content-disposition": 'attachment; filename="taskando-dados-pessoais.json"', "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível preparar a exportação agora. Tente novamente." }, { status: 500 });
  }
}
