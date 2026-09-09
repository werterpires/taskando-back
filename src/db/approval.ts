import type { WorkState } from "./task-state";

export function taskApprovalRequired(taskType: string, requested: boolean | undefined) {
  // Data and Lembrete are temporal markers, not work items that go through approval.
  return taskType !== "date" && taskType !== "reminder" && requested === true;
}

export function statusAfterApprovalConfiguration(status: WorkState, approvalRequired: boolean): WorkState {
  return approvalRequired && status === "completed" ? "awaiting_approval" : status;
}
