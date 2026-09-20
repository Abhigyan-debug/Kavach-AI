/**
 * Per-IP fixed-window rate limit.
 *
 * In-process, so on serverless each instance keeps its own counter and the
 * effective limit is higher than the configured one. That is acceptable here:
 * the goal is to stop a public demo link from burning the API budget, not to
 * enforce a precise quota. Swap in Upstash Redis if this ever needs to be exact.
 */
const WINDOW_MS = 60_000;
const LIMIT = Number(process.env.RATE_LIMIT_PER_MIN ?? 20);

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(ip: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    // Opportunistic sweep so the map cannot grow without bound.
    if (buckets.size > 5000) {
      const stale: string[] = [];
      buckets.forEach((b, key) => {
        if (now >= b.resetAt) stale.push(key);
      });
      stale.forEach((key) => buckets.delete(key));
    }
    return { ok: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > LIMIT) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

/** Best-effort client IP from the proxy headers Vercel sets. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
