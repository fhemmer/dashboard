/**
 * Types for the news fetcher module.
 */

/**
 * A parsed feed item from RSS 2.0 or Atom.
 */
export interface ParsedFeedItem {
  title: string;
  link: string;
  guid: string;
  summary: string | null;
  imageUrl: string | null;
  publishedAt: Date;
}

/**
 * Result of parsing a feed.
 */
export interface ParseFeedResult {
  items: ParsedFeedItem[];
  error: string | null;
}

/**
 * Result of fetching news for a single source.
 */
export interface FetchSourceResult {
  sourceId: string;
  sourceName: string;
  newItemsCount: number;
  error: string | null;
}

/**
 * Overall result of the fetch operation.
 */
export interface FetchNewsResult {
  success: boolean;
  sourcesProcessed: number;
  totalNewItems: number;
  notificationsCreated: number;
  notificationsDeleted: number;
  errors: string[];
  durationMs: number;
}

/**
 * System settings relevant to the fetcher.
 */
export interface FetcherSettings {
  fetchIntervalMinutes: number;
  notificationRetentionDays: number;
  lastFetchAt: Date | null;
}

/**
 * News source from database with fields needed for fetching.
 */
export interface FetchableSource {
  id: string;
  url: string;
  name: string;
}

/**
 * User with their excluded source IDs.
 */
export interface UserWithExclusions {
  userId: string;
  excludedSourceIds: string[];
}
