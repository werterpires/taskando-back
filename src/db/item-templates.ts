export const templateSourceTypes = ["project", "front", "product", "process", "phase", "task"] as const;

export type TemplateSourceType = typeof templateSourceTypes[number];

export const templateSourceLabels: Record<TemplateSourceType, string> = {
  project: "Projeto",
  front: "Frente",
  product: "Produto",
  process: "Processo",
  phase: "Fase",
  task: "Tarefa",
};

export function isTemplateSourceType(value: unknown): value is TemplateSourceType {
  return typeof value === "string" && (templateSourceTypes as readonly string[]).includes(value);
}

export function normalizeTemplateName(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export type TemplateCatalogSummary = {
  description: string;
  schemaVersion: number;
  nodeCount: number;
  dependencyLinkCount: number;
  typeCounts: Partial<Record<TemplateSourceType, number>>;
  structureSummary: string;
};

const typeOrder: TemplateSourceType[] = ["project", "front", "product", "process", "phase", "task"];

export function summarizeTemplateSnapshot(snapshotJson: string): TemplateCatalogSummary | null {
  try {
    const snapshot = JSON.parse(snapshotJson) as { schemaVersion?: unknown; root?: unknown; links?: { dependencies?: unknown } };
    if (!snapshot.root || typeof snapshot.root !== "object") return null;
    const counts: Partial<Record<TemplateSourceType, number>> = {};
    const seenLocalIds = new Set<string>();
    let description = "";
    const walk = (value: unknown, root = false): boolean => {
      if (!value || typeof value !== "object") return false;
      const node = value as { localId?: unknown; type?: unknown; fields?: unknown; children?: unknown };
      if (!isTemplateSourceType(node.type)) return false;
      if (typeof node.localId === "string") {
        if (seenLocalIds.has(node.localId)) return false;
        seenLocalIds.add(node.localId);
      }
      counts[node.type] = (counts[node.type] ?? 0) + 1;
      if (root && node.fields && typeof node.fields === "object") {
        const candidate = (node.fields as { description?: unknown }).description;
        if (typeof candidate === "string") description = candidate.trim();
      }
      if (node.children === undefined) return true;
      return Array.isArray(node.children) && node.children.every((child) => walk(child));
    };
    if (!walk(snapshot.root, true)) return null;
    const structureSummary = typeOrder.filter((type) => counts[type]).map((type) => `${counts[type]} ${templateSourceLabels[type]}${counts[type] === 1 ? "" : "s"}`).join(" · ");
    const dependencies = Array.isArray(snapshot.links?.dependencies) ? snapshot.links.dependencies.length : 0;
    return { description, schemaVersion: typeof snapshot.schemaVersion === "number" ? snapshot.schemaVersion : 1, nodeCount: Object.values(counts).reduce((sum, count) => sum + (count ?? 0), 0), dependencyLinkCount: dependencies, typeCounts: counts, structureSummary };
  } catch {
    return null;
  }
}
