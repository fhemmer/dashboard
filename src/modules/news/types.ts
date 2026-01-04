import type { Database } from "@/lib/supabase/database.types";
import type { WidgetHeight } from "@/lib/widgets";
import type { BrandColor, NewsSourceCategory, SourceIcon } from "@/modules/news-sources";

export type NewsCategory = NewsSourceCategory;

/**
 * Database row type for news items.
 */
export type NewsItemRow = Database["public"]["Tables"]["news_items"]["Row"];

/**
 * Embedded source information within a news item.
 */
export interface NewsItemSource {
  id: string;
  name: string;
  iconName: SourceIcon;
  brandColor: BrandColor;
  category: NewsCategory;
}

/**
 * News item with embedded source information.
 */
export interface NewsItem {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  imageUrl: string | null;
  publishedAt: Date;
  source: NewsItemSource;
}

/**
 * Result of fetching news items.
 */
export interface FetchNewsItemsResult {
  items: NewsItem[];
  error: string | null;
}

/**
 * Props for the NewsWidget component.
 */
export interface NewsWidgetProps {
  widgetHeight?: WidgetHeight;
}

/**
 * News source with exclusion status for the current user.
 */
export interface NewsSourceWithExclusion {
  id: string;
  name: string;
  iconName: SourceIcon;
  brandColor: BrandColor;
  category: NewsCategory;
  isExcluded: boolean;
}

/**
 * Result of fetching sources with exclusion status.
 */
export interface FetchSourcesWithExclusionResult {
  sources: NewsSourceWithExclusion[];
  error: string | null;
}