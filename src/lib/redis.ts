import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client for caching
 * Used by Mail Module for caching email summaries and message lists
 */
let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn("Redis credentials not configured. Caching will be disabled.");
    return null;
  }

  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  return redis;
}

/**
 * Get a cached value from Redis
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const value = await client.get<T>(key);
    return value;
  } catch (error) {
    console.error("Redis get error:", error);
    return null;
  }
}

/**
 * Set a cached value in Redis with TTL (in seconds)
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number = 300
): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.set(key, value, { ex: ttlSeconds });
    return true;
  } catch (error) {
    console.error("Redis set error:", error);
    return false;
  }
}

/**
 * Delete a cached value from Redis
 */
export async function deleteCache(key: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error("Redis delete error:", error);
    return false;
  }
}

/**
 * Delete multiple cached values matching a pattern using SCAN
 * Uses cursor-based iteration to avoid blocking (production-safe)
 */
export async function deleteCachePattern(pattern: string): Promise<number> {
  const client = getRedisClient();
  if (!client) return 0;

  try {
    let cursor = "0";
    let deletedCount = 0;
    const batchSize = 100;

    // Use cursor-based SCAN to iterate keys without blocking
    do {
      const [newCursor, keys] = await client.scan(cursor, {
        match: pattern,
        count: batchSize,
      });
      cursor = String(newCursor);

      if (keys.length > 0) {
        await client.del(...keys);
        deletedCount += keys.length;
      }
    } while (cursor !== "0");

    return deletedCount;
  } catch (error) {
    console.error("Redis delete pattern error:", error);
    return 0;
  }
}
