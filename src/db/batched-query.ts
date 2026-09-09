/**
 * D1 limits the number of bound variables in a single statement. Keep large
 * IN (...) lookups below that limit while preserving the existing result shape.
 */
export async function selectInBatches<T>(
  ids: readonly string[],
  query: (batch: string[]) => Promise<T[]>,
  batchSize = 50,
) {
  const rows: T[] = [];
  for (let index = 0; index < ids.length; index += batchSize) {
    rows.push(...await query(ids.slice(index, index + batchSize)));
  }
  return rows;
}
