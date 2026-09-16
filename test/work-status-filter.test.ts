import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { edgesForNodes, enrichDependencyGraph, type DependencyNode } from "../src/db/dependencies";
import { isDependencyReleased } from "../src/db/dependency-release";
import type { dependencyEdges, tasks } from "../src/db/schema";
import * as schema from "../src/db/schema";
import { includesWorkStatus, normalizeIncludeClosed } from "../src/db/work-status-filter";

test("includeClosed normaliza combinações, repetição e valores desconhecidos", () => {
  const empty = normalizeIncludeClosed([]);
  assert.equal(empty.error, undefined);
  assert.deepEqual(empty.filter.includeClosed, []);
  assert.equal(includesWorkStatus(empty.filter, "todo"), true);
  assert.equal(includesWorkStatus(empty.filter, "completed"), false);

  const selected = normalizeIncludeClosed(["archived,completed", "completed", "cancelled"]);
  assert.equal(selected.error, undefined);
  assert.deepEqual(selected.filter.includeClosed, ["completed", "cancelled", "archived"]);
  assert.equal(selected.filter.canonical, "completed,cancelled,archived");
  assert.equal(includesWorkStatus(selected.filter, "cancelled"), true);

  const invalid = normalizeIncludeClosed(["completed,done"]);
  assert.match(invalid.error ?? "", /done/);
});

test("liberação mantém cancelamento e datas, mas nunca trata arquivado como liberado", () => {
  const base = { status: "todo", taskType: "simple", dateAt: null, endAt: null } as typeof tasks.$inferSelect;
  assert.equal(isDependencyReleased({ ...base, status: "completed" }), true);
  assert.equal(isDependencyReleased({ ...base, status: "cancelled" }), true);
  assert.equal(isDependencyReleased({ ...base, status: "archived", taskType: "date", dateAt: "2020-01-01" }), false);
  assert.equal(isDependencyReleased({ ...base, taskType: "date", dateAt: "2020-01-01" }, new Date("2026-01-01T00:00:00Z")), true);
  assert.equal(isDependencyReleased({ ...base, taskType: "event", endAt: "2030-01-01T00:00:00Z" }, new Date("2026-01-01T00:00:00Z")), false);
});

test("grafo preserva nós e deriva bloqueadores e capacidades apenas dos nós visíveis", () => {
  const node = (id: string, released: boolean, canConnect: boolean): DependencyNode => ({
    type: "task", id, title: id.toUpperCase(), status: "todo", released, canConnect,
    containerType: "phase", containerId: "phase", processId: "process",
  });
  const nodes = [node("released", true, true), node("blocked", false, false), node("successor", false, true)];
  const edge = (id: string, predecessorId: string) => ({
    id, predecessorType: "task" as const, predecessorId, successorType: "task" as const,
    successorId: "successor", createdAt: "2026-09-16T00:00:00.000Z",
  }) satisfies typeof dependencyEdges.$inferSelect;
  const graph = enrichDependencyGraph(nodes, [edge("released-edge", "released"), edge("blocked-edge", "blocked")]);

  assert.deepEqual(graph.nodes.map((item) => item.id), ["released", "blocked", "successor"]);
  const successor = graph.nodes.find((item) => item.id === "successor")!;
  assert.equal(successor.dependencyState, "blocked");
  assert.deepEqual(successor.dependencyBlockers, [{ type: "task", id: "blocked", title: "BLOCKED" }]);
  assert.equal(graph.edges.find((item) => item.id === "released-edge")?.canRemove, true);
  assert.equal(graph.edges.find((item) => item.id === "blocked-edge")?.canRemove, false);
});

test("consulta do grafo limita arestas aos nós do contêiner", async () => {
  const client = new PGlite();
  try {
    await client.exec(`
      create table dependency_edges (id text, predecessor_type text, predecessor_id text, successor_type text, successor_id text, created_at text);
      insert into dependency_edges values
        ('inside', 'task', 'one', 'task', 'two', ''),
        ('outside', 'task', 'elsewhere', 'task', 'another', ''),
        ('crossing', 'task', 'one', 'task', 'elsewhere', '');
    `);
    const db = drizzle(client, { schema });
    const node = (id: string): DependencyNode => ({ type: "task", id, title: id, status: "todo", released: false, canConnect: true, containerType: "phase", containerId: "phase", processId: "process" });
    const rows = await edgesForNodes({ db } as never, [node("one"), node("two")]);
    assert.deepEqual(rows.map((row) => row.id), ["inside"]);
  } finally { await client.close(); }
});
