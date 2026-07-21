/**
 * Simple in-memory rate limiter — correct for a single-instance deployment
 * (one Railway container). If we ever scale horizontally, swap for Redis.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Periodically drop expired buckets so the map doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}, 60_000).unref();

/** Returns true if the action is allowed, false if the limit is exceeded. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= max;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0].trim() : null) ?? "unknown";
}
