/**
 * Política de retenção da lixeira. O prazo é uma janela mínima de segurança;
 * a remoção física não é automática enquanto existirem referências históricas.
 */
export const TASK_SOFT_DELETE_RETENTION_DAYS = 30;

export function taskRetentionUntil(deletedAt: string, days = TASK_SOFT_DELETE_RETENTION_DAYS) {
  const expires = new Date(deletedAt);
  expires.setUTCDate(expires.getUTCDate() + days);
  return expires.toISOString();
}
