import { ensurePersonalContext } from "../../../../../db/current-user";
import { instantiateTemplate, listInstantiationTargets, loadUsableTemplate, templateDateAnchor, TemplateInstantiationError } from "../../../../../db/template-instantiation";
import type { HierarchyType } from "../../../../../db/hierarchy";

const respondToError = (error: unknown) => error instanceof TemplateInstantiationError ? Response.json({ error: error.message }, { status: error.status }) : Response.json({ error: "Não foi possível instanciar este template." }, { status: 500 });

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  try {
    const { id } = await params; const loaded = await loadUsableTemplate(context, id); const targets = await listInstantiationTargets(context, loaded.template.sourceType);
    return Response.json({ setup: { templateId: loaded.template.id, templateName: loaded.template.name, sourceType: loaded.template.sourceType, title: String(loaded.snapshot.root.fields.title ?? loaded.template.sourceTitle), dateAnchor: templateDateAnchor(loaded.nodes), taskCount: loaded.nodes.filter(({ node }) => node.type === "task").length, nodeCount: loaded.nodes.length, targets } });
  } catch (error) { return respondToError(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await ensurePersonalContext();
  if (!context) return Response.json({ error: "Não autenticado." }, { status: 401 });
  try {
    const { id } = await params;
    const body = await request.json() as { title?: string; parentType?: HierarchyType | "personal" | null; parentId?: string | null; ownerUserId?: string; assigneeIds?: string[]; startDate?: string | null };
    if (body.assigneeIds !== undefined && (!Array.isArray(body.assigneeIds) || body.assigneeIds.some((value) => typeof value !== "string"))) return Response.json({ error: "Responsáveis inválidos." }, { status: 400 });
    const instance = await instantiateTemplate(context, id, body);
    return Response.json({ instance, message: `“${instance.title}” criado com ${instance.nodeCount} ${instance.nodeCount === 1 ? "item" : "itens"}.` }, { status: 201 });
  } catch (error) { return respondToError(error); }
}
