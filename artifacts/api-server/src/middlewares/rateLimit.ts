import type { RequestHandler } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window, per-IP limiter held in process memory. Each autoscale
 * instance counts on its own, so the effective ceiling is limit × instances.
 */
export function rateLimit(options: { name: string; limit: number; windowMs: number }): RequestHandler {
  const buckets = new Map<string, Bucket>();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, options.windowMs);
  sweep.unref();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip ?? "unknown";
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + options.windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;

    if (bucket.count > options.limit) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      req.log?.warn({ limiter: options.name }, "Rate limit exceeded");
      res.status(429).json({ error: "Çox sayda sorğu göndərildi. Bir az sonra yenidən cəhd edin." });
      return;
    }
    next();
  };
}
