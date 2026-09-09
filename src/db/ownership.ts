export type OwnedItem = { ownerUserId: string | null };
export function assertOwner(item: OwnedItem) { if (!item.ownerUserId) throw new Error("Item sem Owner: a migração de ownership precisa ser concluída."); }
export const ownershipRule = "Owner é único e obrigatório. Autor, Owner e responsável pela execução são papéis distintos. Um Owner não pode ser removido ou desativado sem transferir antes a propriedade do item.";
