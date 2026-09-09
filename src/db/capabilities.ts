export const roles = ["watcher", "contributor", "executor", "reviewer", "editor", "leader", "owner"] as const;
export type ItemRole = typeof roles[number];
export type Capability = "view" | "view_children" | "interact" | "approve" | "add_children" | "add_members" | "edit" | "delete";

export const grants: Record<ItemRole, Capability[]> = {
  watcher: ["view"], contributor: ["view", "view_children"], executor: ["view", "view_children", "interact"],
  reviewer: ["view", "view_children", "interact", "approve"], editor: ["view", "view_children", "interact", "add_children", "edit"],
  leader: ["view", "view_children", "interact", "approve", "add_children", "add_members", "edit"],
  owner: ["view", "view_children", "interact", "approve", "add_children", "add_members", "edit", "delete"],
};
export function effectiveCapabilities(directRoles: ItemRole[]) { return new Set(directRoles.flatMap((role) => grants[role])); }
export function hasCapability(directRoles: ItemRole[], capability: Capability) { return effectiveCapabilities(directRoles).has(capability); }
