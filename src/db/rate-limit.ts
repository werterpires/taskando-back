type Bucket = { startedAt: number; count: number };

const buckets = new Map<string, Bucket>();

/** Limite defensivo por instância; a unicidade no D1 continua sendo a garantia da solicitação. */
export function takeRateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const current = buckets.get(key);
  if (!current || now - current.startedAt >= windowMs) {
    buckets.set(key, { startedAt: now, count: 1 });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= limit) return { allowed: false, retryAfterSeconds: Math.ceil((windowMs - (now - current.startedAt)) / 1000) };
  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
