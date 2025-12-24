/**
 * Simple in-memory rate limiter
 * Tracks request counts per account to prevent API abuse
 */

interface RateLimitEntry {
  count: number;
  resetAt: Date;
}

const rateLimits = new Map<string, RateLimitEntry>();

// Limits
const MAX_REQUESTS_PER_MINUTE = 30;
const WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Check if a request is allowed for the given key
 */
export function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
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
 * Clean up expired entries (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimits.entries()) {
    if (entry.resetAt.getTime() <= now) {
      rateLimits.delete(key);
    }
  }
}

// Auto-cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}
