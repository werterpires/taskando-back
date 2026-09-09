import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { ensurePersonalContext } from "../../../db/current-user";
import { isTemplateSourceType, normalizeTemplateName, summarizeTemplateSnapshot, templateSourceLabels } from "../../../db/item-templates";
import { itemTemplates, organizationMembers, organizations, users } from "../../../db/schema";
import { captureTemplateSnapshot, TemplateSnapshotError } from "../../../db/template-snapshot";

const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

export async function GET(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const requestedType = url.searchParams.get("type")?.trim() ?? "";
  if (query.length > 160) return Response.json({ error: "Use uma busca de até 160 caracteres." }, { status: 400 });
  if (requestedType && !isTemplateSourceType(requestedType)) return Response.json({ error: "Tipo de template inválido." }, { status: 400 });

  const [ownedOrganizations, memberships] = await Promise.all([
    context.db.select({ id: organizations.id }).from(organizations).where(eq(organizations.ownerUserId, context.user.id)),
    context.db.select({ organizationId: organizationMembers.organizationId }).from(organizationMembers).where(and(eq(organizationMembers.userId, context.user.id), eq(organizationMembers.status, "active"))),
  ]);
  const visibleOrganizationIds = [...new Set([...ownedOrganizations.map((item) => item.id), ...memberships.map((item) => item.organizationId)])];
  const personalVisibility = and(isNull(itemTemplates.organizationId), eq(itemTemplates.personalSpaceId, context.space.id));
  const visibility = visibleOrganizationIds.length ? or(personalVisibility, inArray(itemTemplates.organizationId, visibleOrganizationIds)) : personalVisibility;
  const rows = await context.db.select({
    id: itemTemplates.id,
    name: itemTemplates.name,
    sourceType: itemTemplates.sourceType,
    sourceTitle: itemTemplates.sourceTitle,
    snapshotVersion: itemTemplates.snapshotVersion,
    snapshotJson: itemTemplates.snapshotJson,
    createdAt: itemTemplates.createdAt,
    organizationId: itemTemplates.organizationId,
    organizationName: organizations.name,
    authorName: users.displayName,
  }).from(itemTemplates)
    .innerJoin(users, eq(itemTemplates.authorUserId, users.id))
    .leftJoin(organizations, eq(itemTemplates.organizationId, organizations.id))
    .where(visibility)
    .orderBy(desc(itemTemplates.createdAt));

  const normalizedQuery = normalizeSearch(query);
  const templates = rows.flatMap((row) => {
    if (requestedType && row.sourceType !== requestedType) return [];
    const summary = summarizeTemplateSnapshot(row.snapshotJson);
    if (!summary) return [];
    const searchable = normalizeSearch([row.name, summary.description, row.authorName, row.sourceTitle, row.organizationName ?? "Área pessoal"].join(" "));
    if (normalizedQuery && !searchable.includes(normalizedQuery)) return [];
    return [{
      id: row.id,
      name: row.name,
      description: summary.description,
      authorName: row.authorName,
      createdAt: row.createdAt,
      sourceType: row.sourceType,
      sourceTypeLabel: templateSourceLabels[row.sourceType],
      sourceTitle: row.sourceTitle,
      originLabel: row.organizationName ?? "Área pessoal",
      snapshotVersion: row.snapshotVersion,
      structure: { nodeCount: summary.nodeCount, dependencyLinkCount: summary.dependencyLinkCount, typeCounts: summary.typeCounts, summary: summary.structureSummary },
      permission: row.organizationId ? { scope: "organization" as const, label: `Membros de ${row.organizationName ?? "organização"}`, canUse: true } : { scope: "personal" as const, label: "Somente você", canUse: true },
    }];
  });
  return Response.json({ templates, total: templates.length });
}

export async function POST(request: Request) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const payload = (await request.json()) as { sourceType?: unknown; sourceId?: unknown; name?: unknown };
  if (!isTemplateSourceType(payload.sourceType)) return Response.json({ error: "Templates só podem ser salvos a partir de Projeto, Frente, Produto, Processo, Fase ou Tarefa." }, { status: 400 });
  const sourceId = typeof payload.sourceId === "string" ? payload.sourceId.trim() : "";
  const name = normalizeTemplateName(payload.name);
  if (!sourceId) return Response.json({ error: "Informe o item de origem." }, { status: 400 });
  if (!name) return Response.json({ error: "Informe um nome para o template." }, { status: 400 });
  if (name.length > 160) return Response.json({ error: "Use um nome de até 160 caracteres." }, { status: 400 });

  try {
    const source = await captureTemplateSnapshot(context, payload.sourceType, sourceId);
    const [template] = await context.db.insert(itemTemplates).values({
      id: crypto.randomUUID(),
      personalSpaceId: context.space.id,
      organizationId: source.organizationId,
      authorUserId: context.user.id,
      sourceType: payload.sourceType,
      sourceId,
      sourceTitle: source.title,
      name,
      snapshotVersion: 2,
      snapshotJson: JSON.stringify(source.snapshot),
    }).returning();
    return Response.json({
      template: { id: template.id, name: template.name, sourceType: template.sourceType, sourceTitle: template.sourceTitle, createdAt: template.createdAt, snapshotVersion: template.snapshotVersion, stats: source.snapshot.stats },
      message: `${templateSourceLabels[payload.sourceType]} salvo como template com ${source.snapshot.stats.nodeCount} ${source.snapshot.stats.nodeCount === 1 ? "item" : "itens"}.`,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof TemplateSnapshotError) return Response.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
