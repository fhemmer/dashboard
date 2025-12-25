/**
 * Simple in-memory rate limiter with on-demand cleanup
 * Tracks request counts per account to prevent API abuse
 * NOTE: In serverless environments, state may not persist across invocations.
 * For production, consider using Redis-based rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetAt: Date;
}

const rateLimits = new Map<string, RateLimitEntry>();

// Limits
const MAX_REQUESTS_PER_MINUTE = 30;
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_ENTRIES = 10000; // Maximum entries to prevent unbounded growth

/**
 * Cleanup expired entries from the rate limit map
 * Called on-demand during rate limit checks
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimits.entries()) {
    if (entry.resetAt.getTime() <= now) {
      rateLimits.delete(key);
    }
  }
}

/**
 * Check if a request is allowed for the given key
 * Performs on-demand cleanup if the map is too large
 */
export function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();

  // Cleanup if map is getting too large
  if (rateLimits.size > MAX_ENTRIES) {
    cleanupExpiredEntries();
  }

  const entry = rateLimits.get(key);

  // No entry or expired window - allow and create new entry
  if (!entry || entry.resetAt.getTime() <= now) {
    rateLimits.set(key, {
      count: 1,
      resetAt: new Date(now + WINDOW_MS),
    });
    return { allowed: true, remaining: MAX_REQUESTS_PER_MINUTE - 1 };
  }

  // Within window - check count
  if (entry.count >= MAX_REQUESTS_PER_MINUTE) {
    return { allowed: false, remaining: 0 };
  }

  // Increment count
  entry.count++;
  rateLimits.set(key, entry);
  
  return { allowed: true, remaining: MAX_REQUESTS_PER_MINUTE - entry.count };
}

/**
 * Reset rate limit for a key
 */
export function resetRateLimit(key: string): void {
  rateLimits.delete(key);
}

/**
 * Clean up expired entries (can be called manually if needed)
 */
export function cleanupRateLimits(): void {
  cleanupExpiredEntries();
}
