/**
 * News fetcher module.
 * Fetches RSS/Atom feeds, upserts news items, creates notifications, and cleans up old data.
 */

import type { Database } from "@/lib/supabase/database.types";
import { SupabaseClient } from "@supabase/supabase-js";
import { hashGuid, parseFeed } from "./parser";
import type {
    FetchableSource,
    FetcherSettings,
    FetchNewsResult,
    FetchSourceResult,
    ParsedFeedItem,
    UserWithExclusions,
} from "./types";

export { hashGuid, parseFeed } from "./parser";
export * from "./types";

/**
 * Main entry point for the news fetcher.
 * Requires a Supabase client with service role key (bypasses RLS).
 */
export async function fetchNews(supabase: SupabaseClient<Database>): Promise<FetchNewsResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let totalNewItems = 0;
  let notificationsCreated = 0;
  let notificationsDeleted = 0;

  try {
    // Get settings
    const settings = await getSettings(supabase);

    // Get active sources
    const sources = await getActiveSources(supabase);
    if (sources.length === 0) {
      return {
        success: true,
        sourcesProcessed: 0,
        totalNewItems: 0,
        notificationsCreated: 0,
        notificationsDeleted: 0,
        errors: [],
        durationMs: Date.now() - startTime,
      };
    }

    // Get all users with their exclusions for notification creation
    const usersWithExclusions = await getUsersWithExclusions(supabase);

    // Process each source
    const sourceResults: FetchSourceResult[] = [];
    for (const source of sources) {
      const result = await fetchSource(supabase, source);
      sourceResults.push(result);
      if (result.error) {
        errors.push(`${source.name}: ${result.error}`);
      } else {
        totalNewItems += result.newItemsCount;
      }
    }

    // Create batched notifications for users
    notificationsCreated = await createBatchedNotifications(supabase, sourceResults, usersWithExclusions);

    // Clean up old notifications
    notificationsDeleted = await cleanupOldNotifications(supabase, settings.notificationRetentionDays);

    // Update last_fetch_at
    await updateLastFetchAt(supabase);

    return {
      success: errors.length === 0,
      sourcesProcessed: sources.length,
      totalNewItems,
      notificationsCreated,
      notificationsDeleted,
      errors,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      sourcesProcessed: 0,
      totalNewItems: 0,
      notificationsCreated: 0,
      notificationsDeleted: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Get fetcher settings from system_settings.
 */
async function getSettings(supabase: SupabaseClient<Database>): Promise<FetcherSettings> {
  const { data, error } = await supabase.from("system_settings").select("key, value");

  if (error) {
    throw new Error(`Failed to fetch settings: ${error.message}`);
  }

  const settings: FetcherSettings = {
    fetchIntervalMinutes: 30,
    notificationRetentionDays: 30,
    lastFetchAt: null,
  };

  for (const row of data || []) {
    if (row.key === "fetch_interval_minutes" && typeof row.value === "number") {
      settings.fetchIntervalMinutes = row.value;
    } else if (row.key === "notification_retention_days" && typeof row.value === "number") {
      settings.notificationRetentionDays = row.value;
    } else if (row.key === "last_fetch_at" && typeof row.value === "string") {
      settings.lastFetchAt = new Date(row.value);
    }
  }

  return settings;
}

/**
 * Get all active news sources.
 */
async function getActiveSources(supabase: SupabaseClient<Database>): Promise<FetchableSource[]> {
  const { data, error } = await supabase
    .from("news_sources")
    .select("id, url, name")
    .eq("is_active", true);

  if (error) {
    throw new Error(`Failed to fetch sources: ${error.message}`);
  }

  return data || [];
}

/**
 * Get all users with their source exclusions.
 */
async function getUsersWithExclusions(supabase: SupabaseClient<Database>): Promise<UserWithExclusions[]> {
  // Get all users
  const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id");

  if (profilesError) {
    throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
  }

  // Get all exclusions
  const { data: exclusions, error: exclusionsError } = await supabase
    .from("user_news_source_exclusions")
    .select("user_id, source_id");

  if (exclusionsError) {
    throw new Error(`Failed to fetch exclusions: ${exclusionsError.message}`);
  }

  // Build user map
  const exclusionMap = new Map<string, string[]>();
  for (const exc of exclusions || []) {
    const existing = exclusionMap.get(exc.user_id) || [];
    existing.push(exc.source_id);
    exclusionMap.set(exc.user_id, existing);
  }

  return (profiles || []).map((p) => ({
    userId: p.id,
    excludedSourceIds: exclusionMap.get(p.id) || [],
  }));
}

/**
 * Fetch and process a single news source.
 */
async function fetchSource(
  supabase: SupabaseClient<Database>,
  source: FetchableSource
): Promise<FetchSourceResult> {
  try {
    // Fetch the feed
    const response = await fetch(source.url, {
      headers: {
        "User-Agent": "Dashboard News Fetcher/1.0",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
    });

    if (!response.ok) {
      return {
        sourceId: source.id,
        sourceName: source.name,
        newItemsCount: 0,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const xml = await response.text();
    const parseResult = parseFeed(xml, source.url);

    if (parseResult.error) {
      return {
        sourceId: source.id,
        sourceName: source.name,
        newItemsCount: 0,
        error: parseResult.error,
      };
    }

    // Upsert items and count new ones
    const newItemsCount = await upsertItems(supabase, source.id, parseResult.items);

    return {
      sourceId: source.id,
      sourceName: source.name,
      newItemsCount,
      error: null,
    };
  } catch (error) {
    return {
      sourceId: source.id,
      sourceName: source.name,
      newItemsCount: 0,
      error: error instanceof Error ? error.message : "Unknown fetch error",
    };
  }
}

/**
 * Upsert news items for a source. Returns count of newly inserted items.
 */
async function upsertItems(
  supabase: SupabaseClient<Database>,
  sourceId: string,
  items: ParsedFeedItem[]
): Promise<number> {
  if (items.length === 0) return 0;

  // Generate hashes for all items
  const itemsWithHashes = await Promise.all(
    items.map(async (item) => ({
      ...item,
      guidHash: await hashGuid(item.guid),
    }))
  );

  // Check which items already exist
  const hashes = itemsWithHashes.map((i) => i.guidHash);
  const { data: existing } = await supabase
    .from("news_items")
    .select("guid_hash")
    .in("guid_hash", hashes);

  const existingHashes = new Set((existing || []).map((e) => e.guid_hash));

  // Filter to only new items
  const newItems = itemsWithHashes.filter((i) => !existingHashes.has(i.guidHash));

  if (newItems.length === 0) return 0;

  // Insert new items
  const insertData = newItems.map((item) => ({
    source_id: sourceId,
    title: item.title,
    link: item.link,
    guid_hash: item.guidHash,
    summary: item.summary,
    image_url: item.imageUrl,
    published_at: item.publishedAt.toISOString(),
  }));

  const { error } = await supabase.from("news_items").insert(insertData);

  if (error) {
    throw new Error(`Failed to insert items: ${error.message}`);
  }

  return newItems.length;
}

/**
 * Create batched notifications for users based on new items per source.
 */
async function createBatchedNotifications(
  supabase: SupabaseClient<Database>,
  sourceResults: FetchSourceResult[],
  users: UserWithExclusions[]
): Promise<number> {
  // Filter to sources that have new items
  const sourcesWithNewItems = sourceResults.filter((r) => r.newItemsCount > 0 && !r.error);

  if (sourcesWithNewItems.length === 0 || users.length === 0) {
    return 0;
  }

  const notifications: Array<{
    user_id: string;
    type: string;
    title: string;
    message: string;
    metadata: { type: string; sourceId: string; sourceName: string; itemCount: number };
  }> = [];

  // For each user, create notifications for sources they haven't excluded
  for (const user of users) {
    for (const source of sourcesWithNewItems) {
      // Skip if user has excluded this source
      if (user.excludedSourceIds.includes(source.sourceId)) {
        continue;
      }

      const itemText = source.newItemsCount === 1 ? "item" : "items";
      notifications.push({
        user_id: user.userId,
        type: "news",
        title: `${source.newItemsCount} new ${itemText} from ${source.sourceName}`,
        message: `Check out the latest updates from ${source.sourceName}`,
        metadata: {
          type: "news",
          sourceId: source.sourceId,
          sourceName: source.sourceName,
          itemCount: source.newItemsCount,
        },
      });
    }
  }

  if (notifications.length === 0) return 0;

  // Batch insert notifications
  const { error } = await supabase.from("notifications").insert(notifications);

  if (error) {
    throw new Error(`Failed to create notifications: ${error.message}`);
  }

  return notifications.length;
}

/**
 * Delete notifications older than retention days.
 */
async function cleanupOldNotifications(
  supabase: SupabaseClient<Database>,
  retentionDays: number
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const { data, error } = await supabase
    .from("notifications")
    .delete()
    .lt("created_at", cutoffDate.toISOString())
    .select("id");

  if (error) {
    throw new Error(`Failed to cleanup notifications: ${error.message}`);
  }

  return data?.length || 0;
}

/**
 * Update the last_fetch_at timestamp in system_settings.
 */
async function updateLastFetchAt(supabase: SupabaseClient<Database>): Promise<void> {
  const { error } = await supabase.from("system_settings").upsert(
    {
      key: "last_fetch_at",
      value: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  if (error) {
    throw new Error(`Failed to update last_fetch_at: ${error.message}`);
  }
}
