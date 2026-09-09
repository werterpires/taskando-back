export const workStates = ["planned", "todo", "in_progress", "awaiting_approval", "completed", "cancelled", "archived"] as const;
export type WorkState = typeof workStates[number];

const transitions: Record<WorkState, WorkState[]> = {
  planned: ["todo", "cancelled", "archived"], todo: ["in_progress", "completed", "cancelled", "archived"],
  in_progress: ["todo", "awaiting_approval", "completed", "cancelled"], awaiting_approval: ["in_progress", "completed", "cancelled"],
  completed: ["todo", "in_progress", "archived"], cancelled: ["todo", "archived"], archived: ["todo"],
};
export const isFinalWorkState = (state: string) => state === "completed" || state === "cancelled" || state === "archived";
export const canTransitionWorkState = (from: WorkState, to: WorkState) => from === to || transitions[from].includes(to);
export const workStateLabel: Record<WorkState, string> = { planned: "Planejado", todo: "A fazer", in_progress: "Em execução", awaiting_approval: "Aguardando aprovação", completed: "Concluído", cancelled: "Cancelado", archived: "Arquivado" };
