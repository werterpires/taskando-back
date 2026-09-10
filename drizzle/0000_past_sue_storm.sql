CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"personal_space_id" text,
	"actor_user_id" text NOT NULL,
	"actor_name" text NOT NULL,
	"action" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" text NOT NULL,
	"summary" text NOT NULL,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_items" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"title" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 999999 NOT NULL,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cyclic_queue_overrides" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"personal_space_id" text NOT NULL,
	"mode" text NOT NULL,
	"position" integer NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	CONSTRAINT "cyclic_queue_overrides_task_id_unique" UNIQUE("task_id")
);
--> statement-breakpoint
CREATE TABLE "cyclic_queue_states" (
	"id" text PRIMARY KEY NOT NULL,
	"personal_space_id" text NOT NULL,
	"released_level" integer DEFAULT 5 NOT NULL,
	"level_5_progress" integer DEFAULT 0 NOT NULL,
	"level_4_progress" integer DEFAULT 0 NOT NULL,
	"level_3_progress" integer DEFAULT 0 NOT NULL,
	"level_2_progress" integer DEFAULT 0 NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	CONSTRAINT "cyclic_queue_states_personal_space_id_unique" UNIQUE("personal_space_id")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"owner_user_id" text,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dependency_edges" (
	"id" text PRIMARY KEY NOT NULL,
	"predecessor_type" text NOT NULL,
	"predecessor_id" text NOT NULL,
	"successor_type" text NOT NULL,
	"successor_id" text NOT NULL,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain_migration_events" (
	"id" text PRIMARY KEY NOT NULL,
	"migration_key" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"summary" text NOT NULL,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	CONSTRAINT "domain_migration_events_migration_key_unique" UNIQUE("migration_key")
);
--> statement-breakpoint
CREATE TABLE "fronts" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"personal_space_id" text NOT NULL,
	"organization_id" text,
	"owner_user_id" text NOT NULL,
	"author_user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"approval_required" boolean DEFAULT false NOT NULL,
	"approved_at" text,
	"approved_by_user_id" text,
	"size" text,
	"importance" text,
	"urgency" text,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_identities" (
	"subject" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "google_identities_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "hierarchy_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"child_type" text NOT NULL,
	"child_id" text NOT NULL,
	"parent_type" text,
	"parent_id" text,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"item_type" text NOT NULL,
	"item_id" text NOT NULL,
	"email" text NOT NULL,
	"user_id" text,
	"role" text DEFAULT 'watcher' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_role_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"item_type" text NOT NULL,
	"item_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"personal_space_id" text NOT NULL,
	"organization_id" text,
	"author_user_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"source_title" text NOT NULL,
	"name" text NOT NULL,
	"snapshot_version" integer DEFAULT 1 NOT NULL,
	"snapshot_json" text NOT NULL,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_tokens" (
	"user_id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"prefix" text NOT NULL,
	"created_at" text NOT NULL,
	"last_used_at" text,
	CONSTRAINT "mcp_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"due_soon_enabled" boolean DEFAULT true NOT NULL,
	"overdue_enabled" boolean DEFAULT true NOT NULL,
	"scheduled_enabled" boolean DEFAULT true NOT NULL,
	"reminder_enabled" boolean DEFAULT true NOT NULL,
	"due_soon_minutes" integer DEFAULT 1440 NOT NULL,
	"time_zone" text DEFAULT 'America/Sao_Paulo' NOT NULL,
	"updated_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"recipient_user_id" text NOT NULL,
	"actor_user_id" text,
	"task_id" text,
	"reminder_id" text,
	"type" text NOT NULL,
	"event_key" text NOT NULL,
	"summary" text NOT NULL,
	"read_at" text,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_attempts" (
	"state_hash" text PRIMARY KEY NOT NULL,
	"nonce" text NOT NULL,
	"verifier" text NOT NULL,
	"expires_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text,
	"email" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"role" text DEFAULT 'watcher' NOT NULL,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT '◈' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "owner_transfer_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"item_type" text NOT NULL,
	"item_id" text NOT NULL,
	"current_owner_user_id" text NOT NULL,
	"proposed_owner_user_id" text NOT NULL,
	"requested_by_user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"pending_key" text,
	"responded_at" text,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal_size_labels" (
	"personal_space_id" text PRIMARY KEY NOT NULL,
	"labels_json" text DEFAULT '["Muito pequeno","Pequeno","Médio","Grande","Muito grande"]' NOT NULL,
	"updated_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal_spaces" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text DEFAULT 'Meu espaço' NOT NULL,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	CONSTRAINT "personal_spaces_owner_user_id_unique" UNIQUE("owner_user_id")
);
--> statement-breakpoint
CREATE TABLE "phases" (
	"id" text PRIMARY KEY NOT NULL,
	"process_id" text NOT NULL,
	"personal_space_id" text NOT NULL,
	"organization_id" text,
	"owner_user_id" text NOT NULL,
	"author_user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"approval_required" boolean DEFAULT false NOT NULL,
	"approved_at" text,
	"approved_by_user_id" text,
	"position" integer DEFAULT 999999 NOT NULL,
	"size" text,
	"importance" text,
	"urgency" text,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "privacy_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"pending_key" text,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"completed_at" text,
	CONSTRAINT "privacy_requests_pending_key_unique" UNIQUE("pending_key")
);
--> statement-breakpoint
CREATE TABLE "processes" (
	"id" text PRIMARY KEY NOT NULL,
	"personal_space_id" text NOT NULL,
	"organization_id" text,
	"owner_user_id" text NOT NULL,
	"author_user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"approval_required" boolean DEFAULT false NOT NULL,
	"approved_at" text,
	"approved_by_user_id" text,
	"auto_complete_when_children_done" boolean DEFAULT false NOT NULL,
	"size" text,
	"importance" text,
	"urgency" text,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"personal_space_id" text NOT NULL,
	"organization_id" text,
	"owner_user_id" text NOT NULL,
	"author_user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"approval_required" boolean DEFAULT false NOT NULL,
	"approved_at" text,
	"approved_by_user_id" text,
	"characteristics_json" text DEFAULT '[]' NOT NULL,
	"size" text,
	"importance" text,
	"urgency" text,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"personal_space_id" text NOT NULL,
	"organization_id" text,
	"owner_user_id" text NOT NULL,
	"author_user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"approval_required" boolean DEFAULT false NOT NULL,
	"approved_at" text,
	"approved_by_user_id" text,
	"size" text,
	"importance" text,
	"urgency" text,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurrence_exceptions" (
	"id" text PRIMARY KEY NOT NULL,
	"series_id" text NOT NULL,
	"occurrence_id" text NOT NULL,
	"action" text NOT NULL,
	"scope" text DEFAULT 'occurrence' NOT NULL,
	"original_scheduled_at" text NOT NULL,
	"override_scheduled_at" text,
	"changes_json" text DEFAULT '{}' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	CONSTRAINT "recurrence_exceptions_occurrence_id_unique" UNIQUE("occurrence_id")
);
--> statement-breakpoint
CREATE TABLE "recurrence_occurrences" (
	"id" text PRIMARY KEY NOT NULL,
	"series_id" text NOT NULL,
	"task_id" text NOT NULL,
	"logical_key" text NOT NULL,
	"scheduled_at" text NOT NULL,
	"period_key" text,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	CONSTRAINT "recurrence_occurrences_task_id_unique" UNIQUE("task_id")
);
--> statement-breakpoint
CREATE TABLE "recurrence_series" (
	"id" text PRIMARY KEY NOT NULL,
	"personal_space_id" text NOT NULL,
	"organization_id" text,
	"owner_user_id" text NOT NULL,
	"author_user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"task_type" text NOT NULL,
	"parent_type" text,
	"parent_id" text,
	"definition_json" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" text PRIMARY KEY NOT NULL,
	"personal_space_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"remind_at" text NOT NULL,
	"time_zone" text DEFAULT 'America/Sao_Paulo' NOT NULL,
	"fired_at" text,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"personal_space_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_assignees" (
	"task_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	CONSTRAINT "task_assignees_task_id_user_id_pk" PRIMARY KEY("task_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "task_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"author_user_id" text NOT NULL,
	"body" text NOT NULL,
	"edited_at" text,
	"deleted_at" text,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_list_tasks" (
	"list_id" text NOT NULL,
	"task_id" text NOT NULL,
	CONSTRAINT "task_list_tasks_list_id_task_id_pk" PRIMARY KEY("list_id","task_id")
);
--> statement-breakpoint
CREATE TABLE "task_lists" (
	"id" text PRIMARY KEY NOT NULL,
	"personal_space_id" text NOT NULL,
	"author_user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_tags" (
	"task_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "task_tags_task_id_tag_id_pk" PRIMARY KEY("task_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"personal_space_id" text NOT NULL,
	"author_user_id" text NOT NULL,
	"owner_user_id" text,
	"organization_id" text,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"task_type" text DEFAULT 'simple' NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"deleted_at" text,
	"deleted_status" text,
	"size" text,
	"importance" text,
	"urgency" text,
	"relevance" integer,
	"cyclic_position" integer DEFAULT 999999 NOT NULL,
	"cyclic_reentry_count" integer DEFAULT 0 NOT NULL,
	"approval_required" boolean DEFAULT false NOT NULL,
	"approved_at" text,
	"approved_by_user_id" text,
	"due_date" text,
	"date_at" text,
	"start_at" text,
	"end_at" text,
	"duration_minutes" integer,
	"completed_at" text,
	"pinned_for_today" boolean DEFAULT false NOT NULL,
	"inbox_position" integer DEFAULT 999999 NOT NULL,
	"today_position" integer DEFAULT 999999 NOT NULL,
	"parent_task_id" text,
	"subtask_position" integer,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"owner_user_id" text,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_personal_space_id_personal_spaces_id_fk" FOREIGN KEY ("personal_space_id") REFERENCES "personal_spaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cyclic_queue_overrides" ADD CONSTRAINT "cyclic_queue_overrides_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cyclic_queue_overrides" ADD CONSTRAINT "cyclic_queue_overrides_personal_space_id_personal_spaces_id_fk" FOREIGN KEY ("personal_space_id") REFERENCES "personal_spaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cyclic_queue_overrides" ADD CONSTRAINT "cyclic_queue_overrides_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cyclic_queue_states" ADD CONSTRAINT "cyclic_queue_states_personal_space_id_personal_spaces_id_fk" FOREIGN KEY ("personal_space_id") REFERENCES "personal_spaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fronts" ADD CONSTRAINT "fronts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fronts" ADD CONSTRAINT "fronts_personal_space_id_personal_spaces_id_fk" FOREIGN KEY ("personal_space_id") REFERENCES "personal_spaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fronts" ADD CONSTRAINT "fronts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fronts" ADD CONSTRAINT "fronts_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fronts" ADD CONSTRAINT "fronts_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fronts" ADD CONSTRAINT "fronts_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_identities" ADD CONSTRAINT "google_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_invitations" ADD CONSTRAINT "item_invitations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_role_assignments" ADD CONSTRAINT "item_role_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_templates" ADD CONSTRAINT "item_templates_personal_space_id_personal_spaces_id_fk" FOREIGN KEY ("personal_space_id") REFERENCES "personal_spaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_templates" ADD CONSTRAINT "item_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_templates" ADD CONSTRAINT "item_templates_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_tokens" ADD CONSTRAINT "mcp_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_reminder_id_reminders_id_fk" FOREIGN KEY ("reminder_id") REFERENCES "reminders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_transfer_requests" ADD CONSTRAINT "owner_transfer_requests_current_owner_user_id_users_id_fk" FOREIGN KEY ("current_owner_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_transfer_requests" ADD CONSTRAINT "owner_transfer_requests_proposed_owner_user_id_users_id_fk" FOREIGN KEY ("proposed_owner_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_transfer_requests" ADD CONSTRAINT "owner_transfer_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_size_labels" ADD CONSTRAINT "personal_size_labels_personal_space_id_personal_spaces_id_fk" FOREIGN KEY ("personal_space_id") REFERENCES "personal_spaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_spaces" ADD CONSTRAINT "personal_spaces_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phases" ADD CONSTRAINT "phases_process_id_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "processes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phases" ADD CONSTRAINT "phases_personal_space_id_personal_spaces_id_fk" FOREIGN KEY ("personal_space_id") REFERENCES "personal_spaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phases" ADD CONSTRAINT "phases_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phases" ADD CONSTRAINT "phases_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phases" ADD CONSTRAINT "phases_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phases" ADD CONSTRAINT "phases_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_personal_space_id_personal_spaces_id_fk" FOREIGN KEY ("personal_space_id") REFERENCES "personal_spaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_personal_space_id_personal_spaces_id_fk" FOREIGN KEY ("personal_space_id") REFERENCES "personal_spaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_personal_space_id_personal_spaces_id_fk" FOREIGN KEY ("personal_space_id") REFERENCES "personal_spaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrence_exceptions" ADD CONSTRAINT "recurrence_exceptions_series_id_recurrence_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "recurrence_series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrence_exceptions" ADD CONSTRAINT "recurrence_exceptions_occurrence_id_recurrence_occurrences_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "recurrence_occurrences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrence_exceptions" ADD CONSTRAINT "recurrence_exceptions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrence_occurrences" ADD CONSTRAINT "recurrence_occurrences_series_id_recurrence_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "recurrence_series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrence_occurrences" ADD CONSTRAINT "recurrence_occurrences_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrence_series" ADD CONSTRAINT "recurrence_series_personal_space_id_personal_spaces_id_fk" FOREIGN KEY ("personal_space_id") REFERENCES "personal_spaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrence_series" ADD CONSTRAINT "recurrence_series_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrence_series" ADD CONSTRAINT "recurrence_series_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrence_series" ADD CONSTRAINT "recurrence_series_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_personal_space_id_personal_spaces_id_fk" FOREIGN KEY ("personal_space_id") REFERENCES "personal_spaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_personal_space_id_personal_spaces_id_fk" FOREIGN KEY ("personal_space_id") REFERENCES "personal_spaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_list_tasks" ADD CONSTRAINT "task_list_tasks_list_id_task_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "task_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_list_tasks" ADD CONSTRAINT "task_list_tasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_lists" ADD CONSTRAINT "task_lists_personal_space_id_personal_spaces_id_fk" FOREIGN KEY ("personal_space_id") REFERENCES "personal_spaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_lists" ADD CONSTRAINT "task_lists_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_personal_space_id_personal_spaces_id_fk" FOREIGN KEY ("personal_space_id") REFERENCES "personal_spaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_tasks_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_organization_created_at_idx" ON "audit_events" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_space_created_at_idx" ON "audit_events" USING btree ("personal_space_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_subject_created_at_idx" ON "audit_events" USING btree ("subject_id","created_at");--> statement-breakpoint
CREATE INDEX "cyclic_queue_overrides_space_idx" ON "cyclic_queue_overrides" USING btree ("personal_space_id");--> statement-breakpoint
CREATE INDEX "cyclic_queue_overrides_task_idx" ON "cyclic_queue_overrides" USING btree ("task_id");--> statement-breakpoint
CREATE UNIQUE INDEX "departments_org_name_unique" ON "departments" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "dependency_edges_unique" ON "dependency_edges" USING btree ("predecessor_type","predecessor_id","successor_type","successor_id");--> statement-breakpoint
CREATE INDEX "dependency_edges_predecessor_idx" ON "dependency_edges" USING btree ("predecessor_type","predecessor_id");--> statement-breakpoint
CREATE INDEX "dependency_edges_successor_idx" ON "dependency_edges" USING btree ("successor_type","successor_id");--> statement-breakpoint
CREATE INDEX "fronts_project_idx" ON "fronts" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "fronts_owner_idx" ON "fronts" USING btree ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hierarchy_child_unique" ON "hierarchy_attachments" USING btree ("child_type","child_id");--> statement-breakpoint
CREATE INDEX "hierarchy_parent_idx" ON "hierarchy_attachments" USING btree ("parent_type","parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "item_invitation_item_email_unique" ON "item_invitations" USING btree ("item_type","item_id","email");--> statement-breakpoint
CREATE INDEX "item_invitation_email_idx" ON "item_invitations" USING btree ("email","status");--> statement-breakpoint
CREATE UNIQUE INDEX "item_role_assignment_unique" ON "item_role_assignments" USING btree ("item_type","item_id","user_id","role");--> statement-breakpoint
CREATE INDEX "item_role_assignment_item_idx" ON "item_role_assignments" USING btree ("item_type","item_id");--> statement-breakpoint
CREATE INDEX "item_templates_space_created_idx" ON "item_templates" USING btree ("personal_space_id","created_at");--> statement-breakpoint
CREATE INDEX "item_templates_source_idx" ON "item_templates" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_recipient_event_unique" ON "notifications" USING btree ("recipient_user_id","event_key");--> statement-breakpoint
CREATE INDEX "notifications_recipient_created_idx" ON "notifications" USING btree ("recipient_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_members_org_email_unique" ON "organization_members" USING btree ("organization_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "owner_transfer_requests_pending_unique" ON "owner_transfer_requests" USING btree ("pending_key");--> statement-breakpoint
CREATE INDEX "owner_transfer_requests_recipient_status_idx" ON "owner_transfer_requests" USING btree ("proposed_owner_user_id","status","created_at");--> statement-breakpoint
CREATE INDEX "owner_transfer_requests_item_created_idx" ON "owner_transfer_requests" USING btree ("item_type","item_id","created_at");--> statement-breakpoint
CREATE INDEX "phases_process_position_idx" ON "phases" USING btree ("process_id","position");--> statement-breakpoint
CREATE INDEX "phases_owner_idx" ON "phases" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "privacy_requests_user_created_idx" ON "privacy_requests" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "processes_organization_idx" ON "processes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "processes_owner_idx" ON "processes" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "products_organization_idx" ON "products" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "products_owner_idx" ON "products" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "projects_organization_idx" ON "projects" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "projects_owner_idx" ON "projects" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "recurrence_exceptions_series_idx" ON "recurrence_exceptions" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "recurrence_exceptions_original_scheduled_idx" ON "recurrence_exceptions" USING btree ("series_id","original_scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "recurrence_occurrences_series_logical_unique" ON "recurrence_occurrences" USING btree ("series_id","logical_key");--> statement-breakpoint
CREATE INDEX "recurrence_occurrences_series_scheduled_idx" ON "recurrence_occurrences" USING btree ("series_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "recurrence_occurrences_task_idx" ON "recurrence_occurrences" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "recurrence_series_owner_idx" ON "recurrence_series" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "recurrence_series_space_idx" ON "recurrence_series" USING btree ("personal_space_id");--> statement-breakpoint
CREATE INDEX "recurrence_series_parent_idx" ON "recurrence_series" USING btree ("parent_type","parent_id");--> statement-breakpoint
CREATE INDEX "reminders_space_remind_at_idx" ON "reminders" USING btree ("personal_space_id","remind_at");--> statement-breakpoint
CREATE INDEX "reminders_due_idx" ON "reminders" USING btree ("personal_space_id","fired_at","remind_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_space_name_unique" ON "tags" USING btree ("personal_space_id","name");--> statement-breakpoint
CREATE INDEX "task_assignees_user_idx" ON "task_assignees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "task_comments_task_created_idx" ON "task_comments" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_lists_space_name_unique" ON "task_lists" USING btree ("personal_space_id","name");--> statement-breakpoint
CREATE INDEX "tasks_parent_task_idx" ON "tasks" USING btree ("parent_task_id","subtask_position");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_org_name_unique" ON "teams" USING btree ("organization_id","name");
