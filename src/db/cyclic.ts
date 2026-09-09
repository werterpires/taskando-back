import { and, asc, eq, isNull } from "drizzle-orm";
import { cyclicQueueOverrides, cyclicQueueStates, tasks } from "./schema";
import { resolveCyclicReleasedLevel } from "./cyclic-gate";

type Database = NonNullable<Awaited<ReturnType<typeof import("./current-user").ensurePersonalContext>>>["db"];
type CyclicState = typeof cyclicQueueStates.$inferSelect;
type CyclicRow = typeof tasks.$inferSelect;
export type CyclicAdjustmentMode = "until_completion" | "relevance" | "persistent" | "algorithm";

export const cyclicRelevanceMin = 1;
export const cyclicRelevanceMax = 5;
export const cyclicDefaultRelevance = 3;

export function normalizeCyclicRelevance(taskType: string, value: unknown) {
  if (taskType !== "cyclic") {
    return value === undefined || value === null || value === ""
      ? { value: null as number | null }
      : { value: null as number | null, error: "Somente tarefas Cíclicas possuem relevância." };
  }
  if (value === undefined || value === null || value === "") return { value: cyclicDefaultRelevance };
  const relevance = Number(value);
  if (!Number.isInteger(relevance) || relevance < cyclicRelevanceMin || relevance > cyclicRelevanceMax) {
    return { value: null as number | null, error: "A relevância cíclica deve ser um número inteiro entre 1 e 5." };
  }
  return { value: relevance };
}

export async function nextCyclicPosition(db: Database, personalSpaceId: string) {
  const rows = await db.select({ position: tasks.cyclicPosition }).from(tasks).where(and(eq(tasks.personalSpaceId, personalSpaceId), eq(tasks.taskType, "cyclic"), isNull(tasks.deletedAt)));
  return Math.max(0, ...rows.map((row) => row.position ?? 0)) + 1;
}

export async function getCyclicQueueState(db: Database, personalSpaceId: string) {
  let [state] = await db.select().from(cyclicQueueStates).where(eq(cyclicQueueStates.personalSpaceId, personalSpaceId)).limit(1);
  if (state) return state;
  await db.insert(cyclicQueueStates).values({ id: crypto.randomUUID(), personalSpaceId }).onConflictDoNothing();
  [state] = await db.select().from(cyclicQueueStates).where(eq(cyclicQueueStates.personalSpaceId, personalSpaceId)).limit(1);
  return state!;
}

async function queueRows(db: Database, personalSpaceId: string) {
  return db.select().from(tasks).where(and(eq(tasks.personalSpaceId, personalSpaceId), eq(tasks.taskType, "cyclic"), isNull(tasks.deletedAt))).orderBy(asc(tasks.cyclicPosition), asc(tasks.createdAt));
}

async function queueOverrides(db: Database, personalSpaceId: string) {
  return db.select().from(cyclicQueueOverrides).where(eq(cyclicQueueOverrides.personalSpaceId, personalSpaceId));
}

function activeRows(rows: CyclicRow[]) {
  return rows.filter((row) => !["cancelled", "archived"].includes(row.status));
}

function withAvailableReleasedLevel(state: CyclicState, rows: CyclicRow[]) {
  return { ...state, releasedLevel: resolveCyclicReleasedLevel(state.releasedLevel, activeRows(rows).map((row) => row.relevance ?? cyclicDefaultRelevance)) };
}

export async function getEffectiveCyclicQueueState(db: Database, personalSpaceId: string) {
  const [state, rows] = await Promise.all([getCyclicQueueState(db, personalSpaceId), queueRows(db, personalSpaceId)]);
  return withAvailableReleasedLevel(state, rows);
}

/** Persistent overrides are anchors; every other task fills the remaining slots in algorithmic order. */
function applyPersistentAnchors(rows: CyclicRow[], overrides: typeof cyclicQueueOverrides.$inferSelect[]) {
  const persistent = overrides.filter((override) => override.mode === "persistent").sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
  const slots: (CyclicRow | null)[] = Array.from({ length: rows.length }, () => null);
  const anchoredIds = new Set<string>();
  for (const override of persistent) {
    const row = rows.find((item) => item.id === override.taskId);
    if (!row || anchoredIds.has(row.id)) continue;
    let index = Math.max(0, Math.min(rows.length - 1, override.position - 1));
    while (index < slots.length && slots[index]) index += 1;
    if (index >= slots.length) index = slots.findIndex((slot) => !slot);
    if (index >= 0) { slots[index] = row; anchoredIds.add(row.id); }
  }
  const movable = rows.filter((row) => !anchoredIds.has(row.id));
  let movableIndex = 0;
  return slots.map((slot) => slot ?? movable[movableIndex++]).filter((row): row is CyclicRow => Boolean(row));
}

function explainPosition(row: CyclicRow, position: number, state: CyclicState, override?: typeof cyclicQueueOverrides.$inferSelect) {
  const level = row.relevance ?? cyclicDefaultRelevance;
  if (override?.mode === "persistent") return `Exceção persistente definida manualmente para a posição ${position}.`;
  if (override?.mode === "until_completion") return `Ajuste manual temporário; vale até a próxima conclusão desta Cíclica.`;
  return `Posição calculada pela relevância ${level}; o nível liberado agora é ${state.releasedLevel}.`;
}

export async function listCyclicQueue(db: Database, personalSpaceId: string) {
  const [storedState, rows, overrides] = await Promise.all([getCyclicQueueState(db, personalSpaceId), queueRows(db, personalSpaceId), queueOverrides(db, personalSpaceId)]);
  const state = withAvailableReleasedLevel(storedState, rows);
  const active = applyPersistentAnchors(activeRows(rows), overrides);
  const overrideByTask = new Map(overrides.map((override) => [override.taskId, override]));
  const progress = { 5: state.level5Progress, 4: state.level4Progress, 3: state.level3Progress, 2: state.level2Progress };
  return {
    state: { id: state.id, revision: state.revision, releasedLevel: state.releasedLevel, progress },
    queueLength: active.length,
    tasks: active.map((row, index) => {
      const override = overrideByTask.get(row.id);
      return { ...row, queuePosition: index + 1, released: (row.relevance ?? cyclicDefaultRelevance) === state.releasedLevel, queueSource: override?.mode === "persistent" ? "persistent" as const : override?.mode === "until_completion" ? "temporary" as const : "algorithm" as const, queueReason: explainPosition(row, index + 1, state, override), overrideMode: override?.mode ?? null };
    }),
  };
}

const progressColumn: Record<number, "level5Progress" | "level4Progress" | "level3Progress" | "level2Progress"> = {
  5: "level5Progress", 4: "level4Progress", 3: "level3Progress", 2: "level2Progress",
};

function nextGate(state: CyclicState, availableLevels: number[]) {
  const level = state.releasedLevel;
  if (level === 1) return { releasedLevel: resolveCyclicReleasedLevel(5, availableLevels), progress: {} };
  const column = progressColumn[level];
  const progress = state[column] + 1;
  if (progress >= 2) return { releasedLevel: resolveCyclicReleasedLevel(level - 1, availableLevels), progress: { [column]: 0 } };
  return { releasedLevel: resolveCyclicReleasedLevel(5, availableLevels), progress: { [column]: progress } };
}

function movedToPosition<T extends { id: string }>(rows: T[], taskId: string, position: number) {
  const currentIndex = rows.findIndex((row) => row.id === taskId);
  if (currentIndex < 0) return null;
  const next = [...rows];
  const [row] = next.splice(currentIndex, 1);
  next.splice(Math.max(0, Math.min(next.length, position - 1)), 0, row);
  return next;
}

async function claimRevision(db: Database, state: CyclicState, updatedAt: string) {
  const [claimed] = await db.update(cyclicQueueStates).set({ revision: state.revision + 1, updatedAt }).where(and(eq(cyclicQueueStates.id, state.id), eq(cyclicQueueStates.revision, state.revision))).returning();
  return claimed ?? null;
}

export async function adjustCyclicQueue(db: Database, input: { personalSpaceId: string; taskId: string; position: number; mode: CyclicAdjustmentMode; relevance?: unknown; userId: string; expectedRevision?: number }) {
  const state = await getCyclicQueueState(db, input.personalSpaceId);
  if (input.expectedRevision !== undefined && input.expectedRevision !== state.revision) return { error: "A fila mudou enquanto você a ajustava. Recarregue a fila e tente novamente.", conflict: true as const };
  const rows = activeRows(await queueRows(db, input.personalSpaceId));
  const current = rows.find((row) => row.id === input.taskId);
  if (!current) return { error: "Cíclica não encontrada ou já encerrada." };
  if (!Number.isInteger(input.position) || input.position < 1 || input.position > rows.length) return { error: `Escolha uma posição entre 1 e ${rows.length}.` };
  if (!["until_completion", "relevance", "persistent", "algorithm"].includes(input.mode)) return { error: "Precedência de ajuste inválida." };
  const normalized = input.mode === "relevance" ? normalizeCyclicRelevance("cyclic", input.relevance) : { value: current.relevance ?? cyclicDefaultRelevance };
  if (normalized.error) return { error: normalized.error };
  const existingOverrides = await queueOverrides(db, input.personalSpaceId);
  const overrideByTask = new Map(existingOverrides.map((override) => [override.taskId, override]));
  if (input.mode === "algorithm" || input.mode === "relevance") overrideByTask.delete(input.taskId);
  else overrideByTask.set(input.taskId, { id: "draft", taskId: input.taskId, personalSpaceId: input.personalSpaceId, mode: input.mode, position: input.position, createdByUserId: input.userId, createdAt: "", updatedAt: "" });
  let ordered = movedToPosition(rows, input.taskId, input.position)!;
  ordered = applyPersistentAnchors(ordered, [...overrideByTask.values()]);
  const now = new Date().toISOString();
  const claimed = await claimRevision(db, state, now);
  if (!claimed) return { error: "A fila mudou enquanto você a ajustava. Recarregue a fila e tente novamente.", conflict: true as const };
  const statements: Parameters<Database["batch"]>[0] = ordered.map((row, index) => db.update(tasks).set({ cyclicPosition: index + 1, ...(row.id === input.taskId && input.mode === "relevance" ? { relevance: normalized.value } : {}), updatedAt: now }).where(eq(tasks.id, row.id)));
  statements.push(db.delete(cyclicQueueOverrides).where(eq(cyclicQueueOverrides.taskId, input.taskId)));
  if (input.mode === "until_completion" || input.mode === "persistent") statements.push(db.insert(cyclicQueueOverrides).values({ id: crypto.randomUUID(), taskId: input.taskId, personalSpaceId: input.personalSpaceId, mode: input.mode, position: input.position, createdByUserId: input.userId, updatedAt: now }));
  await db.batch(statements);
  return { ...(await listCyclicQueue(db, input.personalSpaceId)), adjustedTaskId: input.taskId, mode: input.mode, conflict: false as const };
}

export async function completeCyclicTask(db: Database, task: typeof tasks.$inferSelect) {
  const [storedState, queue] = await Promise.all([getCyclicQueueState(db, task.personalSpaceId), queueRows(db, task.personalSpaceId)]);
  const active = activeRows(queue);
  const state = withAvailableReleasedLevel(storedState, active);
  if ((task.relevance ?? cyclicDefaultRelevance) !== state.releasedLevel) return { error: `Esta Cíclica está no nível ${task.relevance ?? cyclicDefaultRelevance}; o nível liberado agora é ${state.releasedLevel}.` as string };
  const gate = nextGate(state, active.map((row) => row.relevance ?? cyclicDefaultRelevance));
  const rows = active.filter((row) => row.id !== task.id);
  const overrides = await queueOverrides(db, task.personalSpaceId);
  const override = overrides.find((item) => item.taskId === task.id);
  const relevancePosition = Math.max(0, rows.length - Math.max(cyclicRelevanceMin, Math.min(cyclicRelevanceMax, task.relevance ?? cyclicDefaultRelevance)));
  const targetPosition = override?.mode === "persistent" ? Math.max(1, Math.min(rows.length + 1, override.position)) : relevancePosition + 1;
  let ordered = movedToPosition([...rows, { ...task, status: "todo" as const }], task.id, targetPosition)!;
  ordered = applyPersistentAnchors(ordered, overrides);
  const now = new Date().toISOString();
  const claimed = await claimRevision(db, state, now);
  if (!claimed) return { error: "A fila mudou enquanto a conclusão era registrada. Recarregue a fila e tente novamente.", conflict: true as const };
  const statements: Parameters<Database["batch"]>[0] = ordered.map((row, index) => db.update(tasks).set(
    row.id === task.id
      ? { status: "todo", completedAt: null, cyclicPosition: index + 1, cyclicReentryCount: (task.cyclicReentryCount ?? 0) + 1, updatedAt: now }
      : { cyclicPosition: index + 1, updatedAt: now },
  ).where(eq(tasks.id, row.id)));
  if (override?.mode === "until_completion") statements.push(db.delete(cyclicQueueOverrides).where(eq(cyclicQueueOverrides.taskId, task.id)));
  await db.update(cyclicQueueStates).set({ releasedLevel: gate.releasedLevel, ...gate.progress, updatedAt: now }).where(eq(cyclicQueueStates.id, state.id));
  await db.batch(statements);
  const [updated] = await db.select().from(tasks).where(eq(tasks.id, task.id)).limit(1);
  return { task: updated ?? task, position: (updated ?? task).cyclicPosition, releasedLevel: gate.releasedLevel, conflict: false as const };
}
