import { and, eq, sql } from "drizzle-orm";
import { dependencyContainer, dependencyNodeTypes, edgesForNodes, validateDependencyEdge } from "../../../db/dependencies";
import { ensurePersonalContext } from "../../../db/current-user";
import { dependencyEdges } from "../../../db/schema";
import { refreshDependencyReleases } from "../../../db/dependency-release";

const containerTypes = ["process", "phase"] as const;

export async function GET(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const containerType = searchParams.get("containerType");
  const containerId = searchParams.get("containerId");
  if (!containerId || !containerTypes.includes(containerType as typeof containerTypes[number])) return Response.json({ error: "Contêiner de dependências inválido." }, { status: 400 });
  const data = await dependencyContainer(context, containerType as "process" | "phase", containerId);
  if (!data) return Response.json({ error: "Você não tem acesso a este contêiner." }, { status: 403 });
  const nodes = [...data.taskNodes, ...data.phaseNodes];
  return Response.json({ tasks: data.taskNodes, phases: data.phaseNodes, edges: await edgesForNodes(context, nodes) });
}

export async function POST(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const body = await request.json() as { predecessorType?: string; predecessorId?: string; successorType?: string; successorId?: string };
  if (!body.predecessorId || !body.successorId || !dependencyNodeTypes.includes(body.predecessorType as typeof dependencyNodeTypes[number]) || !dependencyNodeTypes.includes(body.successorType as typeof dependencyNodeTypes[number])) return Response.json({ error: "Predecessora e sucessora são obrigatórias." }, { status: 400 });
  const validation = await validateDependencyEdge(context, body.predecessorType as typeof dependencyNodeTypes[number], body.predecessorId, body.successorType as typeof dependencyNodeTypes[number], body.successorId);
  if ("error" in validation) return Response.json({ error: validation.error }, { status: 400 });
  const [existing] = await context.db.select().from(dependencyEdges).where(and(eq(dependencyEdges.predecessorType, body.predecessorType as "task" | "phase"), eq(dependencyEdges.predecessorId, body.predecessorId), eq(dependencyEdges.successorType, body.successorType as "task" | "phase"), eq(dependencyEdges.successorId, body.successorId))).limit(1);
  if (existing) return Response.json({ edge: existing, duplicate: true });
  const edgeId = crypto.randomUUID();
  try {
    await context.db.run(sql`
      WITH RECURSIVE reachable(node_type, node_id) AS (
        SELECT successor_type, successor_id
        FROM ${dependencyEdges}
        WHERE predecessor_type = ${body.successorType} AND predecessor_id = ${body.successorId}
        UNION
        SELECT edge.successor_type, edge.successor_id
        FROM ${dependencyEdges} edge
        INNER JOIN reachable path ON edge.predecessor_type = path.node_type AND edge.predecessor_id = path.node_id
      )
      INSERT INTO ${dependencyEdges} (id, predecessor_type, predecessor_id, successor_type, successor_id)
      SELECT ${edgeId}, ${body.predecessorType}, ${body.predecessorId}, ${body.successorType}, ${body.successorId}
      WHERE ${body.predecessorId} <> ${body.successorId}
        AND NOT EXISTS (
          SELECT 1 FROM reachable
          WHERE node_type = ${body.predecessorType} AND node_id = ${body.predecessorId}
        )
    `);
    const [edge] = await context.db.select().from(dependencyEdges).where(eq(dependencyEdges.id, edgeId)).limit(1);
    if (!edge) return Response.json({ error: "Essa ligação criaria uma dependência circular." }, { status: 400 });
    await refreshDependencyReleases(context, body.successorType === "task" ? [body.successorId] : undefined);
    return Response.json({ edge }, { status: 201 });
  } catch (reason) {
    const [duplicate] = await context.db.select().from(dependencyEdges).where(and(eq(dependencyEdges.predecessorType, body.predecessorType as "task" | "phase"), eq(dependencyEdges.predecessorId, body.predecessorId), eq(dependencyEdges.successorType, body.successorType as "task" | "phase"), eq(dependencyEdges.successorId, body.successorId))).limit(1);
    if (duplicate) return Response.json({ edge: duplicate, duplicate: true });
    throw reason;
  }
}
