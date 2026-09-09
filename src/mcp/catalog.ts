export const operationCatalog = [
  {
    "route": "/api/projects",
    "methods": [
      "GET",
      "POST"
    ],
    "parameters": [],
    "payloadReference": [
      "{ title?: string; description?: string; status?: ProjectStatus; approvalRequired?: boolean; size?: typeof sizes[number] | null; importance?: typeof priorities[number] | null; urgency?: typeof priorities[number] | null; parentType?: ParentType; parentId?: string | null }"
    ]
  },
  {
    "route": "/api/projects/[id]",
    "methods": [
      "PATCH"
    ],
    "parameters": [
      "id"
    ],
    "payloadReference": [
      "{ title?: string; description?: string; status?: typeof statuses[number]; approvalRequired?: boolean; approve?: boolean; size?: typeof sizes[number] | null; importance?: typeof priorities[number] | null; urgency?: typeof priorities[number] | null; move?: boolean; parentType?: ParentType; parentId?: string | null }"
    ]
  },
  {
    "route": "/api/products",
    "methods": [
      "GET",
      "POST"
    ],
    "parameters": [],
    "payloadReference": [
      "{ title?: string; description?: string; status?: typeof statuses[number]; size?: typeof sizes[number] | null; importance?: typeof priorities[number] | null; urgency?: typeof priorities[number] | null; approvalRequired?: boolean; characteristics?: Characteristic[]; parentType?: ParentType; parentId?: string | null }"
    ]
  },
  {
    "route": "/api/products/[id]",
    "methods": [
      "GET",
      "PATCH"
    ],
    "parameters": [
      "id"
    ],
    "payloadReference": [
      "{ title?: string; description?: string; status?: typeof productStatuses[number]; size?: typeof productSizes[number] | null; importance?: typeof productPriorities[number] | null; urgency?: typeof productPriorities[number] | null; approvalRequired?: boolean; characteristics?: { key: string; value: string }"
    ]
  },
  {
    "route": "/api/products/targets",
    "methods": [
      "GET"
    ],
    "parameters": [],
    "payloadReference": []
  },
  {
    "route": "/api/processes",
    "methods": [
      "GET",
      "POST"
    ],
    "parameters": [],
    "payloadReference": [
      "{ title?: string; description?: string; status?: typeof processStatuses[number]; approvalRequired?: boolean; size?: typeof processSizes[number] | null; importance?: typeof processPriorities[number] | null; urgency?: typeof processPriorities[number] | null; parentType?: ProcessParentType; parentId?: string | null }"
    ]
  },
  {
    "route": "/api/processes/[id]",
    "methods": [
      "GET",
      "PATCH"
    ],
    "parameters": [
      "id"
    ],
    "payloadReference": [
      "{ title?: string; description?: string; status?: typeof processStatuses[number]; approvalRequired?: boolean; size?: typeof processSizes[number] | null; importance?: typeof processPriorities[number] | null; urgency?: typeof processPriorities[number] | null; parentType?: ProcessParentType; parentId?: string | null; approve?: boolean }"
    ]
  },
  {
    "route": "/api/processes/[id]/phases",
    "methods": [
      "GET",
      "POST"
    ],
    "parameters": [
      "id"
    ],
    "payloadReference": [
      "{ title?: string; description?: string; status?: typeof statuses[number]; approvalRequired?: boolean; size?: typeof sizes[number] | null; importance?: typeof priorities[number] | null; urgency?: typeof priorities[number] | null }"
    ]
  },
  {
    "route": "/api/phases/[id]",
    "methods": [
      "GET",
      "PATCH"
    ],
    "parameters": [
      "id"
    ],
    "payloadReference": [
      "{ title?: string; description?: string; status?: typeof statuses[number]; approvalRequired?: boolean; size?: typeof sizes[number] | null; importance?: typeof priorities[number] | null; urgency?: typeof priorities[number] | null; approve?: boolean; cancelDecision?: \"release\" | \"cascade\"; parentType?: unknown; parentId?: unknown; processId?: unknown; position?: number }"
    ]
  },
  {
    "route": "/api/fronts",
    "methods": [
      "GET"
    ],
    "parameters": [],
    "payloadReference": []
  },
  {
    "route": "/api/fronts/[id]",
    "methods": [
      "GET",
      "PATCH"
    ],
    "parameters": [
      "id"
    ],
    "payloadReference": [
      "{ title?: string; description?: string; status?: typeof statuses[number]; approvalRequired?: boolean; approve?: boolean; size?: typeof sizes[number] | null; importance?: typeof priorities[number] | null; urgency?: typeof priorities[number] | null; projectId?: string; parentType?: string; parentId?: string }"
    ]
  },
  {
    "route": "/api/tasks/[id]",
    "methods": [
      "PATCH",
      "DELETE"
    ],
    "parameters": [
      "id"
    ],
    "payloadReference": [
      "{ status?: WorkState; reason?: string; subtaskResolution?: \"complete\" | \"cancel\"; cancelDecision?: \"release\" | \"cascade\"; title?: string; description?: string; dueDate?: string | null; dateAt?: string | null; startAt?: string | null; endAt?: string | null; durationMinutes?: number | null; pinnedForToday?: boolean; tags?: string[]; approvalRequired?: boolean; approve?: boolean; size?: \"xs\" | \"s\" | \"m\" | \"l\" | \"xl\" | null; importance?: \"low\" | \"medium\" | \"high\" | null; urgency?: \"low\" | \"medium\" | \"high\" | null; relevance?: number | null }"
    ]
  },
  {
    "route": "/api/tasks/[id]/subtasks",
    "methods": [
      "GET",
      "POST",
      "PATCH"
    ],
    "parameters": [
      "id"
    ],
    "payloadReference": [
      "{ title?: string; taskType?: string; dueDate?: string | null; dateAt?: string | null; startAt?: string | null; endAt?: string | null; durationMinutes?: number | null }",
      "{ orderedIds?: string[] };\n  if (!Array.isArray(payload.orderedIds) || payload.orderedIds.length !== new Set(payload.orderedIds).size) return Response.json({ error: \"Ordem de subtarefas inválida.\" }"
    ]
  },
  {
    "route": "/api/tasks/[id]/comments",
    "methods": [
      "GET",
      "POST"
    ],
    "parameters": [
      "id"
    ],
    "payloadReference": [
      "{ body?: string }; const body = payload.body?.trim() ?? \"\";\n  if (!body || body.length > 3000) return Response.json({ error: \"Escreva um comentário de até 3.000 caracteres.\" }"
    ]
  },
  {
    "route": "/api/tasks/[id]/comments/[commentId]",
    "methods": [
      "PATCH",
      "DELETE"
    ],
    "parameters": [
      "id",
      "commentId"
    ],
    "payloadReference": [
      "{ body?: string }; const body = payload.body?.trim() ?? \"\";\n  if (!body || body.length > 3000) return Response.json({ error: \"Escreva um comentário de até 3.000 caracteres.\" }"
    ]
  },
  {
    "route": "/api/tasks/[id]/checklist",
    "methods": [
      "GET",
      "POST"
    ],
    "parameters": [
      "id"
    ],
    "payloadReference": [
      "{ title?: string };\n  const title = payload.title?.trim() ?? \"\";\n  if (!title || title.length > 240) return Response.json({ error: \"Informe um item de até 240 caracteres.\" }"
    ]
  },
  {
    "route": "/api/tasks/[id]/checklist/[itemId]",
    "methods": [
      "PATCH",
      "DELETE"
    ],
    "parameters": [
      "id",
      "itemId"
    ],
    "payloadReference": [
      "{ title?: string; completed?: boolean }"
    ]
  },
  {
    "route": "/api/tasks/[id]/checklist/reorder",
    "methods": [
      "POST"
    ],
    "parameters": [
      "id"
    ],
    "payloadReference": [
      "{ itemIds?: string[] };\n  if (!Array.isArray(payload.itemIds) || new Set(payload.itemIds).size !== payload.itemIds.length) return Response.json({ error: \"Ordem inválida.\" }"
    ]
  },
  {
    "route": "/api/tasks/[id]/audit",
    "methods": [
      "GET"
    ],
    "parameters": [
      "id"
    ],
    "payloadReference": []
  },
  {
    "route": "/api/task-containers/[parentType]/[parentId]",
    "methods": [
      "GET",
      "POST"
    ],
    "parameters": [
      "parentType",
      "parentId"
    ],
    "payloadReference": []
  },
  {
    "route": "/api/dependencies",
    "methods": [
      "GET",
      "POST"
    ],
    "parameters": [],
    "payloadReference": [
      "{ predecessorType?: string; predecessorId?: string; successorType?: string; successorId?: string }",
      "containerType",
      "containerId"
    ]
  },
  {
    "route": "/api/dependencies/[id]",
    "methods": [
      "DELETE"
    ],
    "parameters": [
      "id"
    ],
    "payloadReference": []
  },
  {
    "route": "/api/organizations",
    "methods": [
      "GET",
      "POST"
    ],
    "parameters": [],
    "payloadReference": [
      "{ name?: string; description?: string; icon?: string }"
    ]
  },
  {
    "route": "/api/organizations/[id]",
    "methods": [
      "PATCH"
    ],
    "parameters": [
      "id"
    ],
    "payloadReference": [
      "{ name?: string; description?: string; icon?: string; status?: \"active\" | \"inactive\" }"
    ]
  },
  {
    "route": "/api/organizations/[id]/structure",
    "methods": [
      "GET",
      "POST"
    ],
    "parameters": [
      "id"
    ],
    "payloadReference": [
      "{ kind?: \"department\" | \"team\"; name?: string; description?: string; status?: \"active\" | \"inactive\"; parentType?: \"organization\" | \"department\"; parentId?: string }"
    ]
  },
  {
    "route": "/api/organizations/[id]/structure/[kind]/[itemId]",
    "methods": [
      "PATCH"
    ],
    "parameters": [
      "id",
      "kind",
      "itemId"
    ],
    "payloadReference": [
      "{ name?: string; description?: string; status?: \"active\" | \"inactive\"; parentType?: \"organization\" | \"department\" | null; parentId?: string | null }"
    ]
  },
  {
    "route": "/api/personal/structure",
    "methods": [
      "GET",
      "POST"
    ],
    "parameters": [],
    "payloadReference": [
      "{ kind?: \"department\" | \"team\"; name?: string; description?: string; status?: \"active\" | \"inactive\"; parentType?: \"department\" | null; parentId?: string | null }"
    ]
  },
  {
    "route": "/api/personal/structure/[kind]/[itemId]",
    "methods": [
      "PATCH"
    ],
    "parameters": [
      "kind",
      "itemId"
    ],
    "payloadReference": [
      "{ name?: string; description?: string; status?: \"active\" | \"inactive\"; parentType?: \"organization\" | \"department\" | null; parentId?: string | null }"
    ]
  },
  {
    "route": "/api/context",
    "methods": [
      "GET"
    ],
    "parameters": [],
    "payloadReference": [
      "parentType",
      "parentId"
    ]
  },
  {
    "route": "/api/work-progress/[parentType]/[parentId]",
    "methods": [
      "GET"
    ],
    "parameters": [
      "parentType",
      "parentId"
    ],
    "payloadReference": []
  },
  {
    "route": "/api/lists",
    "methods": [
      "GET",
      "POST"
    ],
    "parameters": [],
    "payloadReference": [
      "{ name?: string; copyFromId?: string }"
    ]
  },
  {
    "route": "/api/lists/[id]",
    "methods": [
      "DELETE"
    ],
    "parameters": [
      "id"
    ],
    "payloadReference": []
  },
  {
    "route": "/api/lists/[id]/tasks",
    "methods": [
      "POST"
    ],
    "parameters": [
      "id"
    ],
    "payloadReference": [
      "{ taskId?: string; taskIds?: string[] }"
    ]
  },
  {
    "route": "/api/lists/[id]/tasks/[taskId]",
    "methods": [
      "DELETE"
    ],
    "parameters": [
      "id",
      "taskId"
    ],
    "payloadReference": []
  },
  {
    "route": "/api/reminders",
    "methods": [
      "GET",
      "POST",
      "PATCH",
      "DELETE"
    ],
    "parameters": [],
    "payloadReference": [
      "{ title?: unknown; description?: unknown; remindAt?: unknown; timeZone?: unknown }",
      "{ id?: string; title?: unknown; description?: unknown; remindAt?: unknown; timeZone?: unknown }",
      "{ id?: string };\n  if (!payload.id) return Response.json({ error: \"Lembrete inválido.\" }"
    ]
  },
  {
    "route": "/api/reminders/due",
    "methods": [
      "GET"
    ],
    "parameters": [],
    "payloadReference": []
  },
  {
    "route": "/api/cyclic-queue",
    "methods": [
      "GET",
      "PATCH"
    ],
    "parameters": [],
    "payloadReference": [
      "{ taskId?: string; position?: number; mode?: CyclicAdjustmentMode; relevance?: number | null; expectedRevision?: number }"
    ]
  },
  {
    "route": "/api/recurrence-series",
    "methods": [
      "GET",
      "POST"
    ],
    "parameters": [],
    "payloadReference": [
      "{ title?: string; description?: string; taskType?: string; definition?: unknown; parentType?: TaskParentType | null; parentId?: string | null }"
    ]
  },
  {
    "route": "/api/recurrence-series/[id]",
    "methods": [
      "GET",
      "PATCH",
      "DELETE"
    ],
    "parameters": [
      "id"
    ],
    "payloadReference": [
      "{ title?: string; description?: string; taskType?: string; definition?: unknown; active?: boolean }"
    ]
  },
  {
    "route": "/api/recurrence-series/[id]/materialize",
    "methods": [
      "POST"
    ],
    "parameters": [
      "id"
    ],
    "payloadReference": [
      "{ from?: string; to?: string }"
    ]
  },
  {
    "route": "/api/recurrence-series/materialize-window",
    "methods": [
      "POST"
    ],
    "parameters": [],
    "payloadReference": [
      "{ from?: string; to?: string }"
    ]
  },
  {
    "route": "/api/recurrence-occurrences/[id]",
    "methods": [
      "PATCH"
    ],
    "parameters": [
      "id"
    ],
    "payloadReference": [
      "{ action?: ExceptionAction; scope?: ExceptionScope; scheduledAt?: string; title?: string; description?: string; durationMinutes?: number | null }"
    ]
  },
  {
    "route": "/api/templates",
    "methods": [
      "GET",
      "POST"
    ],
    "parameters": [],
    "payloadReference": [
      "{ sourceType?: unknown; sourceId?: unknown; name?: unknown }",
      "q",
      "type"
    ]
  },
  {
    "route": "/api/templates/[id]/instantiate",
    "methods": [
      "GET",
      "POST"
    ],
    "parameters": [
      "id"
    ],
    "payloadReference": [
      "{ title?: string; parentType?: HierarchyType | \"personal\" | null; parentId?: string | null; ownerUserId?: string; assigneeIds?: string[]; startDate?: string | null }"
    ]
  },
  {
    "route": "/api/recycle-bin/tasks",
    "methods": [
      "GET",
      "POST"
    ],
    "parameters": [],
    "payloadReference": [
      "{ id?: string };\n  if (!payload.id || typeof payload.id !== \"string\") return Response.json({ error: \"Informe a tarefa a restaurar.\" }"
    ]
  },
  {
    "route": "/api/notification-preferences",
    "methods": [
      "GET",
      "PATCH"
    ],
    "parameters": [],
    "payloadReference": []
  },
  {
    "route": "/api/notifications",
    "methods": [
      "GET",
      "PATCH"
    ],
    "parameters": [],
    "payloadReference": []
  },
  {
    "route": "/api/preferences/size-labels",
    "methods": [
      "GET",
      "PATCH"
    ],
    "parameters": [],
    "payloadReference": []
  },
  {
    "route": "/api/approvals",
    "methods": [
      "POST"
    ],
    "parameters": [],
    "payloadReference": [
      "{ subjectType?: string; subjectId?: string; decision?: string; reason?: string }"
    ]
  },
  {
    "route": "/api/owner-transfers",
    "methods": [
      "GET",
      "POST",
      "PATCH"
    ],
    "parameters": [],
    "payloadReference": [
      "{ itemType?: OwnerTransferItemType; itemId?: string; proposedOwnerUserId?: string; mode?: \"normal\" | \"exception\" }",
      "{ id?: string; action?: TransferAction }",
      "inbox",
      "itemType"
    ]
  },
  {
    "route": "/api/item-roles",
    "methods": [
      "GET",
      "POST",
      "DELETE"
    ],
    "parameters": [],
    "payloadReference": [
      "{ itemType?: ItemType; itemId?: string; email?: string; role?: ItemRole }",
      "itemType",
      "itemId",
      "itemType"
    ]
  },
  {
    "route": "/api/item-invitations",
    "methods": [
      "GET",
      "PATCH"
    ],
    "parameters": [],
    "payloadReference": []
  },
  {
    "route": "/api/me",
    "methods": [
      "POST"
    ],
    "parameters": [],
    "payloadReference": []
  }
] as const;
