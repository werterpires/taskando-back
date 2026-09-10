import { sql } from "drizzle-orm";
import { type AnyPgColumn, boolean, index, integer, primaryKey, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
});

/** Solicitações de privacidade são auditáveis e não removem dados compartilhados automaticamente. */
export const privacyRequests = pgTable("privacy_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  type: text("type", { enum: ["deletion"] }).notNull(),
  status: text("status", { enum: ["pending", "processing", "completed", "cancelled"] }).notNull().default("pending"),
  pendingKey: text("pending_key").unique(),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
  completedAt: text("completed_at"),
}, (table) => [index("privacy_requests_user_created_idx").on(table.userId, table.createdAt)]);

export const personalSpaces = pgTable("personal_spaces", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull().unique().references(() => users.id),
  name: text("name").notNull().default("Meu espaço"),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
});

export const personalSizeLabels = pgTable("personal_size_labels", {
  personalSpaceId: text("personal_space_id").primaryKey().references(() => personalSpaces.id),
  labelsJson: text("labels_json").notNull().default('["Muito pequeno","Pequeno","Médio","Grande","Muito grande"]'),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
});

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("◈"),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
});

export const organizationMembers = pgTable("organization_members", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  userId: text("user_id").references(() => users.id),
  email: text("email").notNull(),
  status: text("status", { enum: ["pending", "active", "removed"] }).notNull().default("pending"),
  role: text("role", { enum: ["watcher", "contributor", "executor", "reviewer", "editor", "leader", "owner"] }).notNull().default("watcher"),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [uniqueIndex("organization_members_org_email_unique").on(table.organizationId, table.email)]);

export const departments = pgTable("departments", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").references(() => organizations.id),
  ownerUserId: text("owner_user_id").references(() => users.id),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [uniqueIndex("departments_org_name_unique").on(table.organizationId, table.name)]);

export const teams = pgTable("teams", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").references(() => organizations.id),
  ownerUserId: text("owner_user_id").references(() => users.id),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [uniqueIndex("teams_org_name_unique").on(table.organizationId, table.name)]);

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  personalSpaceId: text("personal_space_id").notNull().references(() => personalSpaces.id),
  organizationId: text("organization_id").references(() => organizations.id),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id),
  authorUserId: text("author_user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status", { enum: ["planned", "todo", "in_progress", "awaiting_approval", "completed", "cancelled", "archived"] }).notNull().default("planned"),
  approvalRequired: boolean("approval_required").notNull().default(false),
  approvedAt: text("approved_at"),
  approvedByUserId: text("approved_by_user_id").references(() => users.id),
  size: text("size", { enum: ["xs", "s", "m", "l", "xl"] }),
  importance: text("importance", { enum: ["low", "medium", "high"] }),
  urgency: text("urgency", { enum: ["low", "medium", "high"] }),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [index("projects_organization_idx").on(table.organizationId), index("projects_owner_idx").on(table.ownerUserId)]);

export const fronts = pgTable("fronts", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  personalSpaceId: text("personal_space_id").notNull().references(() => personalSpaces.id),
  organizationId: text("organization_id").references(() => organizations.id),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id),
  authorUserId: text("author_user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status", { enum: ["planned", "todo", "in_progress", "awaiting_approval", "completed", "cancelled", "archived"] }).notNull().default("planned"),
  approvalRequired: boolean("approval_required").notNull().default(false),
  approvedAt: text("approved_at"),
  approvedByUserId: text("approved_by_user_id").references(() => users.id),
  size: text("size", { enum: ["xs", "s", "m", "l", "xl"] }),
  importance: text("importance", { enum: ["low", "medium", "high"] }),
  urgency: text("urgency", { enum: ["low", "medium", "high"] }),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [index("fronts_project_idx").on(table.projectId), index("fronts_owner_idx").on(table.ownerUserId)]);

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  personalSpaceId: text("personal_space_id").notNull().references(() => personalSpaces.id),
  organizationId: text("organization_id").references(() => organizations.id),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id),
  authorUserId: text("author_user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status", { enum: ["planned", "todo", "in_progress", "awaiting_approval", "completed", "cancelled", "archived"] }).notNull().default("planned"),
  approvalRequired: boolean("approval_required").notNull().default(false),
  approvedAt: text("approved_at"),
  approvedByUserId: text("approved_by_user_id").references(() => users.id),
  characteristicsJson: text("characteristics_json").notNull().default("[]"),
  size: text("size", { enum: ["xs", "s", "m", "l", "xl"] }),
  importance: text("importance", { enum: ["low", "medium", "high"] }),
  urgency: text("urgency", { enum: ["low", "medium", "high"] }),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [index("products_organization_idx").on(table.organizationId), index("products_owner_idx").on(table.ownerUserId)]);

export const processes = pgTable("processes", {
  id: text("id").primaryKey(),
  personalSpaceId: text("personal_space_id").notNull().references(() => personalSpaces.id),
  organizationId: text("organization_id").references(() => organizations.id),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id),
  authorUserId: text("author_user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status", { enum: ["planned", "todo", "in_progress", "awaiting_approval", "completed", "cancelled", "archived"] }).notNull().default("planned"),
  approvalRequired: boolean("approval_required").notNull().default(false),
  approvedAt: text("approved_at"),
  approvedByUserId: text("approved_by_user_id").references(() => users.id),
  autoCompleteWhenChildrenDone: boolean("auto_complete_when_children_done").notNull().default(false),
  size: text("size", { enum: ["xs", "s", "m", "l", "xl"] }),
  importance: text("importance", { enum: ["low", "medium", "high"] }),
  urgency: text("urgency", { enum: ["low", "medium", "high"] }),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [index("processes_organization_idx").on(table.organizationId), index("processes_owner_idx").on(table.ownerUserId)]);

export const phases = pgTable("phases", {
  id: text("id").primaryKey(),
  processId: text("process_id").notNull().references(() => processes.id),
  personalSpaceId: text("personal_space_id").notNull().references(() => personalSpaces.id),
  organizationId: text("organization_id").references(() => organizations.id),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id),
  authorUserId: text("author_user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status", { enum: ["planned", "todo", "in_progress", "awaiting_approval", "completed", "cancelled", "archived"] }).notNull().default("planned"),
  approvalRequired: boolean("approval_required").notNull().default(false),
  approvedAt: text("approved_at"),
  approvedByUserId: text("approved_by_user_id").references(() => users.id),
  position: integer("position").notNull().default(999999),
  size: text("size", { enum: ["xs", "s", "m", "l", "xl"] }),
  importance: text("importance", { enum: ["low", "medium", "high"] }),
  urgency: text("urgency", { enum: ["low", "medium", "high"] }),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [index("phases_process_position_idx").on(table.processId, table.position), index("phases_owner_idx").on(table.ownerUserId)]);

export const auditEvents = pgTable("audit_events", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").references(() => organizations.id),
  personalSpaceId: text("personal_space_id").references(() => personalSpaces.id),
  actorUserId: text("actor_user_id").notNull().references(() => users.id),
  actorName: text("actor_name").notNull(),
  action: text("action", { enum: ["organization_created", "member_invited", "member_accepted", "member_removed", "member_reinvited", "member_role_changed", "task_created", "task_edited", "task_completed", "task_reopened", "task_status_changed", "task_subtasks_cascade", "task_deleted", "task_restored", "cyclic_queue_adjusted", "comment_created", "comment_edited", "comment_deleted", "project_created", "project_edited", "project_moved", "front_created", "front_edited", "product_created", "product_edited", "product_moved", "product_approved", "process_created", "process_edited", "process_moved", "process_approved", "phase_created", "phase_edited", "phase_approved", "approval_requested", "approval_approved", "approval_rejected", "owner_transfer_requested", "owner_transfer_accepted", "owner_transfer_declined", "owner_transfer_cancelled", "owner_transfer_exceptional"] }).notNull(),
  subjectType: text("subject_type", { enum: ["organization", "member", "department", "team", "task", "project", "front", "product", "process", "phase"] }).notNull(),
  subjectId: text("subject_id").notNull(),
  summary: text("summary").notNull(),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [
  index("audit_events_organization_created_at_idx").on(table.organizationId, table.createdAt),
  index("audit_events_space_created_at_idx").on(table.personalSpaceId, table.createdAt),
  index("audit_events_subject_created_at_idx").on(table.subjectId, table.createdAt),
]);

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  personalSpaceId: text("personal_space_id").notNull().references(() => personalSpaces.id),
  authorUserId: text("author_user_id").notNull().references(() => users.id),
  ownerUserId: text("owner_user_id").references(() => users.id),
  organizationId: text("organization_id").references(() => organizations.id),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  taskType: text("task_type", { enum: ["simple", "recurring", "commitment", "scheduled", "date", "event", "cyclic", "reminder", "periodic"] }).notNull().default("simple"),
  status: text("status", { enum: ["planned", "todo", "in_progress", "awaiting_approval", "completed", "cancelled", "archived"] }).notNull().default("todo"),
  /** Exclusão lógica: preserva filhos, dependências, checklist e histórico para restauração segura. */
  deletedAt: text("deleted_at"),
  deletedStatus: text("deleted_status", { enum: ["planned", "todo", "in_progress", "awaiting_approval", "completed", "cancelled", "archived"] }),
  size: text("size", { enum: ["xs", "s", "m", "l", "xl"] }),
  importance: text("importance", { enum: ["low", "medium", "high"] }),
  urgency: text("urgency", { enum: ["low", "medium", "high"] }),
  relevance: integer("relevance"),
  cyclicPosition: integer("cyclic_position").notNull().default(999999),
  cyclicReentryCount: integer("cyclic_reentry_count").notNull().default(0),
  approvalRequired: boolean("approval_required").notNull().default(false),
  approvedAt: text("approved_at"),
  approvedByUserId: text("approved_by_user_id").references(() => users.id),
  dueDate: text("due_date"),
  dateAt: text("date_at"),
  startAt: text("start_at"),
  endAt: text("end_at"),
  durationMinutes: integer("duration_minutes"),
  completedAt: text("completed_at"),
  pinnedForToday: boolean("pinned_for_today").notNull().default(false),
  inboxPosition: integer("inbox_position").notNull().default(999999),
  todayPosition: integer("today_position").notNull().default(999999),
  parentTaskId: text("parent_task_id").references((): AnyPgColumn => tasks.id),
  subtaskPosition: integer("subtask_position"),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [index("tasks_parent_task_idx").on(table.parentTaskId, table.subtaskPosition)]);

/** Templates existem apenas para níveis que representam trabalho. */
export const itemTemplates = pgTable("item_templates", {
  id: text("id").primaryKey(),
  personalSpaceId: text("personal_space_id").notNull().references(() => personalSpaces.id),
  organizationId: text("organization_id").references(() => organizations.id),
  authorUserId: text("author_user_id").notNull().references(() => users.id),
  sourceType: text("source_type", { enum: ["project", "front", "product", "process", "phase", "task"] }).notNull(),
  sourceId: text("source_id").notNull(),
  sourceTitle: text("source_title").notNull(),
  name: text("name").notNull(),
  snapshotVersion: integer("snapshot_version").notNull().default(1),
  snapshotJson: text("snapshot_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [
  index("item_templates_space_created_idx").on(table.personalSpaceId, table.createdAt),
  index("item_templates_source_idx").on(table.sourceType, table.sourceId),
]);

/** Lembretes são avisos pessoais, não tarefas operacionais nem itens de calendário. */
export const reminders = pgTable("reminders", {
  id: text("id").primaryKey(),
  personalSpaceId: text("personal_space_id").notNull().references(() => personalSpaces.id),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  remindAt: text("remind_at").notNull(),
  timeZone: text("time_zone").notNull().default("America/Sao_Paulo"),
  firedAt: text("fired_at"),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [index("reminders_space_remind_at_idx").on(table.personalSpaceId, table.remindAt), index("reminders_due_idx").on(table.personalSpaceId, table.firedAt, table.remindAt)]);

/** Estado da liberação mecânica da fila cíclica de cada espaço pessoal. */
export const cyclicQueueStates = pgTable("cyclic_queue_states", {
  id: text("id").primaryKey(),
  personalSpaceId: text("personal_space_id").notNull().unique().references(() => personalSpaces.id),
  releasedLevel: integer("released_level").notNull().default(5),
  level5Progress: integer("level_5_progress").notNull().default(0),
  level4Progress: integer("level_4_progress").notNull().default(0),
  level3Progress: integer("level_3_progress").notNull().default(0),
  level2Progress: integer("level_2_progress").notNull().default(0),
  revision: integer("revision").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
});

/** Ajustes explícitos da fila Cíclica, com precedência definida pelo usuário. */
export const cyclicQueueOverrides = pgTable("cyclic_queue_overrides", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().unique().references((): AnyPgColumn => tasks.id),
  personalSpaceId: text("personal_space_id").notNull().references(() => personalSpaces.id),
  mode: text("mode", { enum: ["until_completion", "persistent"] }).notNull(),
  position: integer("position").notNull(),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [index("cyclic_queue_overrides_space_idx").on(table.personalSpaceId), index("cyclic_queue_overrides_task_idx").on(table.taskId)]);

/** Definição imutável por ocorrência de uma série recorrente compartilhada. */
export const recurrenceSeries = pgTable("recurrence_series", {
  id: text("id").primaryKey(),
  personalSpaceId: text("personal_space_id").notNull().references(() => personalSpaces.id),
  organizationId: text("organization_id").references(() => organizations.id),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id),
  authorUserId: text("author_user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  taskType: text("task_type", { enum: ["recurring", "scheduled", "periodic"] }).notNull(),
  parentType: text("parent_type", { enum: ["organization", "department", "team", "project", "front", "product", "process", "phase"] }),
  parentId: text("parent_id"),
  definitionJson: text("definition_json").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [index("recurrence_series_owner_idx").on(table.ownerUserId), index("recurrence_series_space_idx").on(table.personalSpaceId), index("recurrence_series_parent_idx").on(table.parentType, table.parentId)]);

/** Ocorrências materializadas preservam o histórico e apontam para a tarefa gerada. */
export const recurrenceOccurrences = pgTable("recurrence_occurrences", {
  id: text("id").primaryKey(),
  seriesId: text("series_id").notNull().references(() => recurrenceSeries.id),
  taskId: text("task_id").notNull().unique().references((): AnyPgColumn => tasks.id),
  logicalKey: text("logical_key").notNull(),
  scheduledAt: text("scheduled_at").notNull(),
  periodKey: text("period_key"),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [uniqueIndex("recurrence_occurrences_series_logical_unique").on(table.seriesId, table.logicalKey), index("recurrence_occurrences_series_scheduled_idx").on(table.seriesId, table.scheduledAt), index("recurrence_occurrences_task_idx").on(table.taskId)]);

/** Exceções isoladas não alteram o arquétipo da série nem apagam seu histórico. */
export const recurrenceExceptions = pgTable("recurrence_exceptions", {
  id: text("id").primaryKey(),
  seriesId: text("series_id").notNull().references(() => recurrenceSeries.id),
  occurrenceId: text("occurrence_id").notNull().unique().references(() => recurrenceOccurrences.id),
  action: text("action", { enum: ["skip", "reschedule", "edit"] }).notNull(),
  scope: text("scope", { enum: ["occurrence", "from_here"] }).notNull().default("occurrence"),
  originalScheduledAt: text("original_scheduled_at").notNull(),
  overrideScheduledAt: text("override_scheduled_at"),
  changesJson: text("changes_json").notNull().default("{}"),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [index("recurrence_exceptions_series_idx").on(table.seriesId), index("recurrence_exceptions_original_scheduled_idx").on(table.seriesId, table.originalScheduledAt)]);

export const taskAssignees = pgTable("task_assignees", {
  taskId: text("task_id").notNull().references((): AnyPgColumn => tasks.id),
  userId: text("user_id").notNull().references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [primaryKey({ columns: [table.taskId, table.userId] }), index("task_assignees_user_idx").on(table.userId)]);

export const hierarchyAttachments = pgTable("hierarchy_attachments", {
  id: text("id").primaryKey(),
  childType: text("child_type", { enum: ["department", "team", "project", "front", "product", "process", "phase", "task"] }).notNull(),
  childId: text("child_id").notNull(),
  parentType: text("parent_type", { enum: ["organization", "department", "team", "project", "front", "product", "process", "phase"] }),
  parentId: text("parent_id"),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [uniqueIndex("hierarchy_child_unique").on(table.childType, table.childId), index("hierarchy_parent_idx").on(table.parentType, table.parentId)]);

/** Arestas do grafo de dependências. Os nós são Tarefas diretas ou Fases. */
export const dependencyEdges = pgTable("dependency_edges", {
  id: text("id").primaryKey(),
  predecessorType: text("predecessor_type", { enum: ["task", "phase"] }).notNull(),
  predecessorId: text("predecessor_id").notNull(),
  successorType: text("successor_type", { enum: ["task", "phase"] }).notNull(),
  successorId: text("successor_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [
  uniqueIndex("dependency_edges_unique").on(table.predecessorType, table.predecessorId, table.successorType, table.successorId),
  index("dependency_edges_predecessor_idx").on(table.predecessorType, table.predecessorId),
  index("dependency_edges_successor_idx").on(table.successorType, table.successorId),
]);

export const domainMigrationEvents = pgTable("domain_migration_events", {
  id: text("id").primaryKey(),
  migrationKey: text("migration_key").notNull().unique(),
  status: text("status", { enum: ["completed"] }).notNull().default("completed"),
  summary: text("summary").notNull(),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
});

export const itemRoleAssignments = pgTable("item_role_assignments", {
  id: text("id").primaryKey(),
  itemType: text("item_type", { enum: ["organization", "department", "team", "project", "front", "product", "process", "phase", "task"] }).notNull(),
  itemId: text("item_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  role: text("role", { enum: ["watcher", "contributor", "executor", "reviewer", "editor", "leader", "owner"] }).notNull(),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [uniqueIndex("item_role_assignment_unique").on(table.itemType, table.itemId, table.userId, table.role), index("item_role_assignment_item_idx").on(table.itemType, table.itemId)]);

/** Transferência normal mantém o Owner atual até o destinatário aceitar. */
export const ownerTransferRequests = pgTable("owner_transfer_requests", {
  id: text("id").primaryKey(),
  itemType: text("item_type", { enum: ["organization", "department", "team", "project", "front", "product", "process", "phase", "task"] }).notNull(),
  itemId: text("item_id").notNull(),
  currentOwnerUserId: text("current_owner_user_id").notNull().references(() => users.id),
  proposedOwnerUserId: text("proposed_owner_user_id").notNull().references(() => users.id),
  requestedByUserId: text("requested_by_user_id").notNull().references(() => users.id),
  status: text("status", { enum: ["pending", "accepted", "declined", "cancelled"] }).notNull().default("pending"),
  pendingKey: text("pending_key"),
  respondedAt: text("responded_at"),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [
  uniqueIndex("owner_transfer_requests_pending_unique").on(table.pendingKey),
  index("owner_transfer_requests_recipient_status_idx").on(table.proposedOwnerUserId, table.status, table.createdAt),
  index("owner_transfer_requests_item_created_idx").on(table.itemType, table.itemId, table.createdAt),
]);

export const itemInvitations = pgTable("item_invitations", {
  id: text("id").primaryKey(),
  itemType: text("item_type", { enum: ["department", "team", "project", "front", "product", "process", "phase", "task"] }).notNull(),
  itemId: text("item_id").notNull(),
  email: text("email").notNull(),
  userId: text("user_id").references(() => users.id),
  role: text("role", { enum: ["watcher", "contributor", "executor", "reviewer", "editor", "leader"] }).notNull().default("watcher"),
  status: text("status", { enum: ["pending", "active", "removed"] }).notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [uniqueIndex("item_invitation_item_email_unique").on(table.itemType, table.itemId, table.email), index("item_invitation_email_idx").on(table.email, table.status)]);

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  recipientUserId: text("recipient_user_id").notNull().references(() => users.id),
  actorUserId: text("actor_user_id").references(() => users.id),
  taskId: text("task_id").references((): AnyPgColumn => tasks.id),
  reminderId: text("reminder_id").references(() => reminders.id),
  // type: text("type", { enum: ["assignment", "comment", "mention", "dependency"] }) now also accepts temporal alert types.
  type: text("type", { enum: ["assignment", "comment", "mention", "dependency", "due_soon", "overdue", "scheduled", "reminder"] }).notNull(),
  eventKey: text("event_key").notNull(),
  summary: text("summary").notNull(),
  readAt: text("read_at"),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [uniqueIndex("notifications_recipient_event_unique").on(table.recipientUserId, table.eventKey), index("notifications_recipient_created_idx").on(table.recipientUserId, table.createdAt)]);

export const notificationPreferences = pgTable("notification_preferences", {
  userId: text("user_id").primaryKey().references(() => users.id),
  dueSoonEnabled: boolean("due_soon_enabled").notNull().default(true),
  overdueEnabled: boolean("overdue_enabled").notNull().default(true),
  scheduledEnabled: boolean("scheduled_enabled").notNull().default(true),
  reminderEnabled: boolean("reminder_enabled").notNull().default(true),
  dueSoonMinutes: integer("due_soon_minutes").notNull().default(1440),
  timeZone: text("time_zone").notNull().default("America/Sao_Paulo"),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
});

export const tags = pgTable("tags", {
  id: text("id").primaryKey(),
  personalSpaceId: text("personal_space_id").notNull().references(() => personalSpaces.id),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [uniqueIndex("tags_space_name_unique").on(table.personalSpaceId, table.name)]);

export const taskTags = pgTable("task_tags", {
  taskId: text("task_id").notNull().references((): AnyPgColumn => tasks.id),
  tagId: text("tag_id").notNull().references(() => tags.id),
}, (table) => [primaryKey({ columns: [table.taskId, table.tagId] })]);

export const checklistItems = pgTable("checklist_items", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references((): AnyPgColumn => tasks.id),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
  position: integer("position").notNull().default(999999),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
});

export const taskComments = pgTable("task_comments", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references((): AnyPgColumn => tasks.id),
  authorUserId: text("author_user_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  editedAt: text("edited_at"),
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [index("task_comments_task_created_idx").on(table.taskId, table.createdAt)]);

export const taskLists = pgTable("task_lists", {
  id: text("id").primaryKey(),
  personalSpaceId: text("personal_space_id").notNull().references(() => personalSpaces.id),
  authorUserId: text("author_user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [uniqueIndex("task_lists_space_name_unique").on(table.personalSpaceId, table.name)]);

export const taskListTasks = pgTable("task_list_tasks", {
  listId: text("list_id").notNull().references(() => taskLists.id),
  taskId: text("task_id").notNull().references((): AnyPgColumn => tasks.id),
}, (table) => [primaryKey({ columns: [table.listId, table.taskId] })]);

/** One active personal integration token; plaintext is never stored. */
export const mcpTokens = pgTable("mcp_tokens", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  prefix: text("prefix").notNull(),
  createdAt: text("created_at").notNull(),
  lastUsedAt: text("last_used_at"),
});

export const googleIdentities = pgTable("google_identities", {
  subject: text("subject").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id),
});
export const passwordCredentials = pgTable("password_credentials", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
  updatedAt: text("updated_at").notNull().default(sql`to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
});
export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  expiresAt: text("expires_at").notNull(),
});
export const oauthAttempts = pgTable("oauth_attempts", {
  stateHash: text("state_hash").primaryKey(),
  nonce: text("nonce").notNull(),
  verifier: text("verifier").notNull(),
  expiresAt: text("expires_at").notNull(),
});
