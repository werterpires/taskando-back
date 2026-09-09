export type HierarchyType = "organization" | "department" | "team" | "project" | "front" | "product" | "process" | "phase" | "task";
export type HierarchyChildType = Exclude<HierarchyType, "organization">;
const ranks: Record<HierarchyType, number> = { organization: 0, department: 1, team: 2, project: 3, front: 4, product: 5, process: 6, phase: 7, task: 8 };

/** Matriz única de pais permitidos para cada tipo de item. */
export const allowedParentTypes: Record<HierarchyChildType, readonly HierarchyType[]> = {
  department: ["organization"],
  team: ["organization", "department"],
  project: ["organization", "department", "team"],
  front: ["project"],
  product: ["organization", "department", "team", "project", "front"],
  process: ["organization", "department", "team", "project", "front", "product"],
  phase: ["process"],
  task: ["organization", "department", "team", "project", "front", "product", "process", "phase"],
};

export const hierarchyChildTypes = new Set<HierarchyChildType>(Object.keys(allowedParentTypes) as HierarchyChildType[]);
export const hierarchyParentTypes = new Set<HierarchyType>(["organization", "department", "team", "project", "front", "product", "process", "phase"]);

export function validateAttachment(childType: HierarchyChildType, childId: string, parentType?: HierarchyType | null, parentId?: string | null) {
  if (!parentType && !parentId) {
    if (childType === "front" || childType === "phase") return "Este item exige um pai.";
    return null;
  }
  if (!parentType || !parentId) return "Pai e identificador do pai devem ser informados juntos.";
  if (!hierarchyChildTypes.has(childType) || !hierarchyParentTypes.has(parentType)) return "Tipo de hierarquia inválido.";
  if (childId === parentId && childType === parentType) return "Um item não pode ser pai de si mesmo.";
  if (!allowedParentTypes[childType].includes(parentType)) {
    if (childType === "front") return "Frente só pode ficar dentro de um Projeto.";
    if (childType === "phase") return "Fase só pode ficar dentro de um Processo.";
    return "O pai informado não é permitido para este item.";
  }
  if (ranks[parentType] >= ranks[childType]) return "O pai precisa estar em nível estritamente superior.";
  return null;
}
