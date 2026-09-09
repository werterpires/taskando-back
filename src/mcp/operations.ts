import * as route0 from "../app/api/projects/route";
import * as route1 from "../app/api/projects/[id]/route";
import * as route2 from "../app/api/products/route";
import * as route3 from "../app/api/products/[id]/route";
import * as route4 from "../app/api/products/targets/route";
import * as route5 from "../app/api/processes/route";
import * as route6 from "../app/api/processes/[id]/route";
import * as route7 from "../app/api/processes/[id]/phases/route";
import * as route8 from "../app/api/phases/[id]/route";
import * as route9 from "../app/api/fronts/route";
import * as route10 from "../app/api/fronts/[id]/route";
import * as route11 from "../app/api/tasks/[id]/route";
import * as route12 from "../app/api/tasks/[id]/subtasks/route";
import * as route13 from "../app/api/tasks/[id]/comments/route";
import * as route14 from "../app/api/tasks/[id]/comments/[commentId]/route";
import * as route15 from "../app/api/tasks/[id]/checklist/route";
import * as route16 from "../app/api/tasks/[id]/checklist/[itemId]/route";
import * as route17 from "../app/api/tasks/[id]/checklist/reorder/route";
import * as route18 from "../app/api/tasks/[id]/audit/route";
import * as route19 from "../app/api/task-containers/[parentType]/[parentId]/route";
import * as route20 from "../app/api/dependencies/route";
import * as route21 from "../app/api/dependencies/[id]/route";
import * as route22 from "../app/api/organizations/route";
import * as route23 from "../app/api/organizations/[id]/route";
import * as route24 from "../app/api/organizations/[id]/structure/route";
import * as route25 from "../app/api/organizations/[id]/structure/[kind]/[itemId]/route";
import * as route26 from "../app/api/personal/structure/route";
import * as route27 from "../app/api/personal/structure/[kind]/[itemId]/route";
import * as route28 from "../app/api/context/route";
import * as route29 from "../app/api/work-progress/[parentType]/[parentId]/route";
import * as route30 from "../app/api/lists/route";
import * as route31 from "../app/api/lists/[id]/route";
import * as route32 from "../app/api/lists/[id]/tasks/route";
import * as route33 from "../app/api/lists/[id]/tasks/[taskId]/route";
import * as route34 from "../app/api/reminders/route";
import * as route35 from "../app/api/reminders/due/route";
import * as route36 from "../app/api/cyclic-queue/route";
import * as route37 from "../app/api/recurrence-series/route";
import * as route38 from "../app/api/recurrence-series/[id]/route";
import * as route39 from "../app/api/recurrence-series/[id]/materialize/route";
import * as route40 from "../app/api/recurrence-series/materialize-window/route";
import * as route41 from "../app/api/recurrence-occurrences/[id]/route";
import * as route42 from "../app/api/templates/route";
import * as route43 from "../app/api/templates/[id]/instantiate/route";
import * as route44 from "../app/api/recycle-bin/tasks/route";
import * as route45 from "../app/api/notification-preferences/route";
import * as route46 from "../app/api/notifications/route";
import * as route47 from "../app/api/preferences/size-labels/route";
import * as route48 from "../app/api/approvals/route";
import * as route49 from "../app/api/owner-transfers/route";
import * as route50 from "../app/api/item-roles/route";
import * as route51 from "../app/api/item-invitations/route";
import * as route52 from "../app/api/me/route";
export type Handler = (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>;
export const operations = [
  { operation: "GET /api/projects", method: "GET", path: "/api/projects", params: [], handler: route0.GET as Handler },
  { operation: "POST /api/projects", method: "POST", path: "/api/projects", params: [], handler: route0.POST as Handler },
  { operation: "PATCH /api/projects/[id]", method: "PATCH", path: "/api/projects/[id]", params: ["id"], handler: route1.PATCH as Handler },
  { operation: "GET /api/products", method: "GET", path: "/api/products", params: [], handler: route2.GET as Handler },
  { operation: "POST /api/products", method: "POST", path: "/api/products", params: [], handler: route2.POST as Handler },
  { operation: "GET /api/products/[id]", method: "GET", path: "/api/products/[id]", params: ["id"], handler: route3.GET as Handler },
  { operation: "PATCH /api/products/[id]", method: "PATCH", path: "/api/products/[id]", params: ["id"], handler: route3.PATCH as Handler },
  { operation: "GET /api/products/targets", method: "GET", path: "/api/products/targets", params: [], handler: route4.GET as Handler },
  { operation: "GET /api/processes", method: "GET", path: "/api/processes", params: [], handler: route5.GET as Handler },
  { operation: "POST /api/processes", method: "POST", path: "/api/processes", params: [], handler: route5.POST as Handler },
  { operation: "GET /api/processes/[id]", method: "GET", path: "/api/processes/[id]", params: ["id"], handler: route6.GET as Handler },
  { operation: "PATCH /api/processes/[id]", method: "PATCH", path: "/api/processes/[id]", params: ["id"], handler: route6.PATCH as Handler },
  { operation: "GET /api/processes/[id]/phases", method: "GET", path: "/api/processes/[id]/phases", params: ["id"], handler: route7.GET as Handler },
  { operation: "POST /api/processes/[id]/phases", method: "POST", path: "/api/processes/[id]/phases", params: ["id"], handler: route7.POST as Handler },
  { operation: "GET /api/phases/[id]", method: "GET", path: "/api/phases/[id]", params: ["id"], handler: route8.GET as Handler },
  { operation: "PATCH /api/phases/[id]", method: "PATCH", path: "/api/phases/[id]", params: ["id"], handler: route8.PATCH as Handler },
  { operation: "GET /api/fronts", method: "GET", path: "/api/fronts", params: [], handler: route9.GET as Handler },
  { operation: "GET /api/fronts/[id]", method: "GET", path: "/api/fronts/[id]", params: ["id"], handler: route10.GET as Handler },
  { operation: "PATCH /api/fronts/[id]", method: "PATCH", path: "/api/fronts/[id]", params: ["id"], handler: route10.PATCH as Handler },
  { operation: "PATCH /api/tasks/[id]", method: "PATCH", path: "/api/tasks/[id]", params: ["id"], handler: route11.PATCH as Handler },
  { operation: "DELETE /api/tasks/[id]", method: "DELETE", path: "/api/tasks/[id]", params: ["id"], handler: route11.DELETE as Handler },
  { operation: "GET /api/tasks/[id]/subtasks", method: "GET", path: "/api/tasks/[id]/subtasks", params: ["id"], handler: route12.GET as Handler },
  { operation: "POST /api/tasks/[id]/subtasks", method: "POST", path: "/api/tasks/[id]/subtasks", params: ["id"], handler: route12.POST as Handler },
  { operation: "PATCH /api/tasks/[id]/subtasks", method: "PATCH", path: "/api/tasks/[id]/subtasks", params: ["id"], handler: route12.PATCH as Handler },
  { operation: "GET /api/tasks/[id]/comments", method: "GET", path: "/api/tasks/[id]/comments", params: ["id"], handler: route13.GET as Handler },
  { operation: "POST /api/tasks/[id]/comments", method: "POST", path: "/api/tasks/[id]/comments", params: ["id"], handler: route13.POST as Handler },
  { operation: "PATCH /api/tasks/[id]/comments/[commentId]", method: "PATCH", path: "/api/tasks/[id]/comments/[commentId]", params: ["id", "commentId"], handler: route14.PATCH as Handler },
  { operation: "DELETE /api/tasks/[id]/comments/[commentId]", method: "DELETE", path: "/api/tasks/[id]/comments/[commentId]", params: ["id", "commentId"], handler: route14.DELETE as Handler },
  { operation: "GET /api/tasks/[id]/checklist", method: "GET", path: "/api/tasks/[id]/checklist", params: ["id"], handler: route15.GET as Handler },
  { operation: "POST /api/tasks/[id]/checklist", method: "POST", path: "/api/tasks/[id]/checklist", params: ["id"], handler: route15.POST as Handler },
  { operation: "PATCH /api/tasks/[id]/checklist/[itemId]", method: "PATCH", path: "/api/tasks/[id]/checklist/[itemId]", params: ["id", "itemId"], handler: route16.PATCH as Handler },
  { operation: "DELETE /api/tasks/[id]/checklist/[itemId]", method: "DELETE", path: "/api/tasks/[id]/checklist/[itemId]", params: ["id", "itemId"], handler: route16.DELETE as Handler },
  { operation: "POST /api/tasks/[id]/checklist/reorder", method: "POST", path: "/api/tasks/[id]/checklist/reorder", params: ["id"], handler: route17.POST as Handler },
  { operation: "GET /api/tasks/[id]/audit", method: "GET", path: "/api/tasks/[id]/audit", params: ["id"], handler: route18.GET as Handler },
  { operation: "GET /api/task-containers/[parentType]/[parentId]", method: "GET", path: "/api/task-containers/[parentType]/[parentId]", params: ["parentType", "parentId"], handler: route19.GET as Handler },
  { operation: "POST /api/task-containers/[parentType]/[parentId]", method: "POST", path: "/api/task-containers/[parentType]/[parentId]", params: ["parentType", "parentId"], handler: route19.POST as Handler },
  { operation: "GET /api/dependencies", method: "GET", path: "/api/dependencies", params: [], handler: route20.GET as Handler },
  { operation: "POST /api/dependencies", method: "POST", path: "/api/dependencies", params: [], handler: route20.POST as Handler },
  { operation: "DELETE /api/dependencies/[id]", method: "DELETE", path: "/api/dependencies/[id]", params: ["id"], handler: route21.DELETE as Handler },
  { operation: "GET /api/organizations", method: "GET", path: "/api/organizations", params: [], handler: route22.GET as Handler },
  { operation: "POST /api/organizations", method: "POST", path: "/api/organizations", params: [], handler: route22.POST as Handler },
  { operation: "PATCH /api/organizations/[id]", method: "PATCH", path: "/api/organizations/[id]", params: ["id"], handler: route23.PATCH as Handler },
  { operation: "GET /api/organizations/[id]/structure", method: "GET", path: "/api/organizations/[id]/structure", params: ["id"], handler: route24.GET as Handler },
  { operation: "POST /api/organizations/[id]/structure", method: "POST", path: "/api/organizations/[id]/structure", params: ["id"], handler: route24.POST as Handler },
  { operation: "PATCH /api/organizations/[id]/structure/[kind]/[itemId]", method: "PATCH", path: "/api/organizations/[id]/structure/[kind]/[itemId]", params: ["id", "kind", "itemId"], handler: route25.PATCH as Handler },
  { operation: "GET /api/personal/structure", method: "GET", path: "/api/personal/structure", params: [], handler: route26.GET as Handler },
  { operation: "POST /api/personal/structure", method: "POST", path: "/api/personal/structure", params: [], handler: route26.POST as Handler },
  { operation: "PATCH /api/personal/structure/[kind]/[itemId]", method: "PATCH", path: "/api/personal/structure/[kind]/[itemId]", params: ["kind", "itemId"], handler: route27.PATCH as Handler },
  { operation: "GET /api/context", method: "GET", path: "/api/context", params: [], handler: route28.GET as Handler },
  { operation: "GET /api/work-progress/[parentType]/[parentId]", method: "GET", path: "/api/work-progress/[parentType]/[parentId]", params: ["parentType", "parentId"], handler: route29.GET as Handler },
  { operation: "GET /api/lists", method: "GET", path: "/api/lists", params: [], handler: route30.GET as Handler },
  { operation: "POST /api/lists", method: "POST", path: "/api/lists", params: [], handler: route30.POST as Handler },
  { operation: "DELETE /api/lists/[id]", method: "DELETE", path: "/api/lists/[id]", params: ["id"], handler: route31.DELETE as Handler },
  { operation: "POST /api/lists/[id]/tasks", method: "POST", path: "/api/lists/[id]/tasks", params: ["id"], handler: route32.POST as Handler },
  { operation: "DELETE /api/lists/[id]/tasks/[taskId]", method: "DELETE", path: "/api/lists/[id]/tasks/[taskId]", params: ["id", "taskId"], handler: route33.DELETE as Handler },
  { operation: "GET /api/reminders", method: "GET", path: "/api/reminders", params: [], handler: route34.GET as Handler },
  { operation: "POST /api/reminders", method: "POST", path: "/api/reminders", params: [], handler: route34.POST as Handler },
  { operation: "PATCH /api/reminders", method: "PATCH", path: "/api/reminders", params: [], handler: route34.PATCH as Handler },
  { operation: "DELETE /api/reminders", method: "DELETE", path: "/api/reminders", params: [], handler: route34.DELETE as Handler },
  { operation: "GET /api/reminders/due", method: "GET", path: "/api/reminders/due", params: [], handler: route35.GET as Handler },
  { operation: "GET /api/cyclic-queue", method: "GET", path: "/api/cyclic-queue", params: [], handler: route36.GET as Handler },
  { operation: "PATCH /api/cyclic-queue", method: "PATCH", path: "/api/cyclic-queue", params: [], handler: route36.PATCH as Handler },
  { operation: "GET /api/recurrence-series", method: "GET", path: "/api/recurrence-series", params: [], handler: route37.GET as Handler },
  { operation: "POST /api/recurrence-series", method: "POST", path: "/api/recurrence-series", params: [], handler: route37.POST as Handler },
  { operation: "GET /api/recurrence-series/[id]", method: "GET", path: "/api/recurrence-series/[id]", params: ["id"], handler: route38.GET as Handler },
  { operation: "PATCH /api/recurrence-series/[id]", method: "PATCH", path: "/api/recurrence-series/[id]", params: ["id"], handler: route38.PATCH as Handler },
  { operation: "DELETE /api/recurrence-series/[id]", method: "DELETE", path: "/api/recurrence-series/[id]", params: ["id"], handler: route38.DELETE as Handler },
  { operation: "POST /api/recurrence-series/[id]/materialize", method: "POST", path: "/api/recurrence-series/[id]/materialize", params: ["id"], handler: route39.POST as Handler },
  { operation: "POST /api/recurrence-series/materialize-window", method: "POST", path: "/api/recurrence-series/materialize-window", params: [], handler: route40.POST as Handler },
  { operation: "PATCH /api/recurrence-occurrences/[id]", method: "PATCH", path: "/api/recurrence-occurrences/[id]", params: ["id"], handler: route41.PATCH as Handler },
  { operation: "GET /api/templates", method: "GET", path: "/api/templates", params: [], handler: route42.GET as Handler },
  { operation: "POST /api/templates", method: "POST", path: "/api/templates", params: [], handler: route42.POST as Handler },
  { operation: "GET /api/templates/[id]/instantiate", method: "GET", path: "/api/templates/[id]/instantiate", params: ["id"], handler: route43.GET as Handler },
  { operation: "POST /api/templates/[id]/instantiate", method: "POST", path: "/api/templates/[id]/instantiate", params: ["id"], handler: route43.POST as Handler },
  { operation: "GET /api/recycle-bin/tasks", method: "GET", path: "/api/recycle-bin/tasks", params: [], handler: route44.GET as Handler },
  { operation: "POST /api/recycle-bin/tasks", method: "POST", path: "/api/recycle-bin/tasks", params: [], handler: route44.POST as Handler },
  { operation: "GET /api/notification-preferences", method: "GET", path: "/api/notification-preferences", params: [], handler: route45.GET as Handler },
  { operation: "PATCH /api/notification-preferences", method: "PATCH", path: "/api/notification-preferences", params: [], handler: route45.PATCH as Handler },
  { operation: "GET /api/notifications", method: "GET", path: "/api/notifications", params: [], handler: route46.GET as Handler },
  { operation: "PATCH /api/notifications", method: "PATCH", path: "/api/notifications", params: [], handler: route46.PATCH as Handler },
  { operation: "GET /api/preferences/size-labels", method: "GET", path: "/api/preferences/size-labels", params: [], handler: route47.GET as Handler },
  { operation: "PATCH /api/preferences/size-labels", method: "PATCH", path: "/api/preferences/size-labels", params: [], handler: route47.PATCH as Handler },
  { operation: "POST /api/approvals", method: "POST", path: "/api/approvals", params: [], handler: route48.POST as Handler },
  { operation: "GET /api/owner-transfers", method: "GET", path: "/api/owner-transfers", params: [], handler: route49.GET as Handler },
  { operation: "POST /api/owner-transfers", method: "POST", path: "/api/owner-transfers", params: [], handler: route49.POST as Handler },
  { operation: "PATCH /api/owner-transfers", method: "PATCH", path: "/api/owner-transfers", params: [], handler: route49.PATCH as Handler },
  { operation: "GET /api/item-roles", method: "GET", path: "/api/item-roles", params: [], handler: route50.GET as Handler },
  { operation: "POST /api/item-roles", method: "POST", path: "/api/item-roles", params: [], handler: route50.POST as Handler },
  { operation: "DELETE /api/item-roles", method: "DELETE", path: "/api/item-roles", params: [], handler: route50.DELETE as Handler },
  { operation: "GET /api/item-invitations", method: "GET", path: "/api/item-invitations", params: [], handler: route51.GET as Handler },
  { operation: "PATCH /api/item-invitations", method: "PATCH", path: "/api/item-invitations", params: [], handler: route51.PATCH as Handler },
  { operation: "POST /api/me", method: "POST", path: "/api/me", params: [], handler: route52.POST as Handler },
];
