/**
 * Mail-specific cache utilities
 * Provides caching patterns for mail data with appropriate TTLs
 */

import { deleteCache, deleteCachePattern, getCache, setCache } from "@/lib/redis";
import type {
  MailAccountSummary,
  MailMessage,
  MailSummary,
} from "../types";
import {
  getMailAccountCacheKey,
  getMailMessagesCacheKey,
  getMailSummaryCacheKey,
} from "../types";

// Cache TTLs (in seconds)
const SUMMARY_TTL = 300; // 5 minutes
const MESSAGES_TTL = 300; // 5 minutes
const ACCOUNT_TTL = 600; // 10 minutes

/**
 * Get cached mail summary for a user
 */
export async function getCachedSummary(userId: string): Promise<MailSummary | null> {
  const key = getMailSummaryCacheKey(userId);
  return getCache<MailSummary>(key);
}

/**
 * Cache mail summary for a user
 */
export async function cacheSummary(userId: string, summary: MailSummary): Promise<boolean> {
  const key = getMailSummaryCacheKey(userId);
  return setCache(key, summary, SUMMARY_TTL);
}

/**
 * Invalidate cached mail summary for a user
 */
export async function invalidateSummaryCache(userId: string): Promise<boolean> {
  const key = getMailSummaryCacheKey(userId);
  return deleteCache(key);
}

/**
 * Get cached messages for an account and folder
 */
export async function getCachedMessages(
  accountId: string,
  folder: string = "inbox"
): Promise<MailMessage[] | null> {
  const key = getMailMessagesCacheKey(accountId, folder);
  return getCache<MailMessage[]>(key);
}

/**
 * Cache messages for an account and folder
 */
export async function cacheMessages(
  accountId: string,
  folder: string,
  messages: MailMessage[]
): Promise<boolean> {
  const key = getMailMessagesCacheKey(accountId, folder);
  return setCache(key, messages, MESSAGES_TTL);
}

/**
 * Invalidate cached messages for an account
 */
export async function invalidateMessagesCache(accountId: string): Promise<number> {
  const pattern = `mail:messages:${accountId}:*`;
  return deleteCachePattern(pattern);
}

/**
 * Get cached account summary
 */
export async function getCachedAccountSummary(
  accountId: string
): Promise<MailAccountSummary | null> {
  const key = getMailAccountCacheKey(accountId);
  return getCache<MailAccountSummary>(key);
}

/**
 * Cache account summary
 */
export async function cacheAccountSummary(
  accountId: string,
  summary: MailAccountSummary
): Promise<boolean> {
  const key = getMailAccountCacheKey(accountId);
  return setCache(key, summary, ACCOUNT_TTL);
}

/**
 * Invalidate all caches for a user (use when accounts are added/removed)
 */
export async function invalidateAllUserCaches(userId: string): Promise<void> {
  await invalidateSummaryCache(userId);
  await deleteCachePattern(`mail:account:*`);
  await deleteCachePattern(`mail:messages:*`);
}
