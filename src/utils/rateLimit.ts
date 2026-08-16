/**
 * In-memory sliding window rate limiter for Cloudflare Workers.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();
let lastCleanup = 0;

function cleanupStaleRecords(now: number): void {
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;

  for (const [key, record] of rateLimitStore.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < 120_000);
    if (record.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Checks if a key exceeds the maximum allowed requests in a given time window.
 * @param key Unique key (e.g. `login:192.168.1.1` or `unlock:slug:ip`)
 * @param maxAttempts Maximum allowed attempts
 * @param windowMs Window in milliseconds (e.g. 60000 for 1 minute)
 */
export function checkRateLimit(key: string, maxAttempts: number, windowMs = 60_000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  cleanupStaleRecords(now);

  let record = rateLimitStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter timestamps within window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxAttempts) {
    return { allowed: false, remaining: 0 };
  }

  record.timestamps.push(now);
  return { allowed: true, remaining: maxAttempts - record.timestamps.length };
}

/**
 * Helper to get client IP from Cloudflare request headers.
 */
export function getClientIp(req: Request): string {
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || '127.0.0.1';
}
