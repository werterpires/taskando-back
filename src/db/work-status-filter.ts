import { notInArray, type AnyColumn, type SQL } from "drizzle-orm";

export const closedWorkStates = ["completed", "cancelled", "archived"] as const;
export type ClosedWorkState = typeof closedWorkStates[number];

export type WorkStatusFilter = {
  includeClosed: readonly ClosedWorkState[];
  excludedClosed: readonly ClosedWorkState[];
  canonical: string;
};

export type WorkStatusFilterResult = { filter: WorkStatusFilter; error?: string };

const allowed = new Set<string>(closedWorkStates);
export const defaultWorkStatusFilter: WorkStatusFilter = {
  includeClosed: [],
  excludedClosed: closedWorkStates,
  canonical: "",
};

/** Parses repeated and comma-separated includeClosed values into a stable set. */
export function normalizeIncludeClosed(values: Iterable<string>): WorkStatusFilterResult {
  const requested = new Set<string>();
  for (const value of values) {
    for (const entry of value.split(",")) {
      const normalized = entry.trim();
      if (normalized) requested.add(normalized);
    }
  }
  const unknown = [...requested].filter((value) => !allowed.has(value));
  if (unknown.length) return { filter: defaultWorkStatusFilter, error: `includeClosed inválido: ${unknown.join(", ")}. Use completed, cancelled e/ou archived.` };
  const includeClosed = closedWorkStates.filter((state) => requested.has(state));
  return {
    filter: {
      includeClosed,
      excludedClosed: closedWorkStates.filter((state) => !requested.has(state)),
      canonical: includeClosed.join(","),
    },
  };
}

export function parseWorkStatusFilter(request: Request): WorkStatusFilterResult {
  return normalizeIncludeClosed(new URL(request.url).searchParams.getAll("includeClosed"));
}

export function workStatusCondition(column: AnyColumn, filter: WorkStatusFilter): SQL | undefined {
  return filter.excludedClosed.length ? notInArray(column, [...filter.excludedClosed]) : undefined;
}

export function includesWorkStatus(filter: WorkStatusFilter, status: string): boolean {
  return !closedWorkStates.includes(status as ClosedWorkState) || filter.includeClosed.includes(status as ClosedWorkState);
}
