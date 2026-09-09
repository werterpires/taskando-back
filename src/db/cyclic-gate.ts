const cyclicRelevanceMin = 1;
const cyclicRelevanceMax = 5;

/**
 * Skips empty levels while preserving the circular release order.
 * If there is no task at or below the stored gate, the queue restarts at the
 * highest available level so it can never become permanently blocked.
 */
export function resolveCyclicReleasedLevel(releasedLevel: number, availableLevels: Iterable<number>) {
  const storedLevel = Math.max(cyclicRelevanceMin, Math.min(cyclicRelevanceMax, Math.trunc(releasedLevel)));
  const available = new Set([...availableLevels].filter((level) => Number.isInteger(level) && level >= cyclicRelevanceMin && level <= cyclicRelevanceMax));
  if (available.size === 0) return storedLevel;

  for (let level = storedLevel; level >= cyclicRelevanceMin; level -= 1) {
    if (available.has(level)) return level;
  }
  for (let level = cyclicRelevanceMax; level > storedLevel; level -= 1) {
    if (available.has(level)) return level;
  }
  return storedLevel;
}
