import type { Database } from "@/lib/supabase/database.types";

/**
 * Database row type for news sources.
 */
export type NewsSourceRow = Database["public"]["Tables"]["news_sources"]["Row"];

/**
 * News source categories.
 */
export type NewsSourceCategory = "tech" | "general" | "ai" | "dev";

/**
 * Available brand colors for news sources.
 */
export const BRAND_COLORS = [
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "emerald",
  "cyan",
  "sky",
  "blue",
  "violet",
  "fuchsia",
  "rose",
] as const;

export type BrandColor = (typeof BRAND_COLORS)[number];

/**
 * Available icons for news sources.
 */
export const SOURCE_ICONS = [
  "blocks",
  "brain",
  "binary",
  "code-2",
  "globe",
  "mic",
  "newspaper",
  "radio",
  "rocket",
  "rss",
  "tv",
] as const;

export type SourceIcon = (typeof SOURCE_ICONS)[number];

/**
 * News source with camelCase fields for client use.
 */
export interface NewsSource {
  id: string;
  url: string;
  name: string;
  category: NewsSourceCategory;
  iconName: SourceIcon;
  brandColor: BrandColor;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
}

/**
 * Input for creating or updating a news source.
 */
export interface NewsSourceInput {
  url: string;
  name: string;
  category: NewsSourceCategory;
  iconName?: SourceIcon;
  brandColor?: BrandColor;
  isActive?: boolean;
}

/**
 * Result of fetching news sources.
 */
export interface FetchNewsSourcesResult {
  sources: NewsSource[];
  error: string | null;
}

/**
 * Result of a mutation operation.
 */
export interface MutationResult {
  success: boolean;
  error: string | null;
}

/**
 * Result of creating a news source.
 */
export interface CreateNewsSourceResult extends MutationResult {
  id?: string;
}

/**
 * User role type.
 */
export type UserRole = "user" | "admin" | "news_manager";

/**
 * Transform a database row to a NewsSource object.
 */
export function toNewsSource(row: NewsSourceRow): NewsSource {
  return {
    id: row.id,
    url: row.url,
    name: row.name,
    category: row.category as NewsSourceCategory,
    iconName: row.icon_name as SourceIcon,
    brandColor: row.brand_color as BrandColor,
    isActive: row.is_active,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Get CSS class for a brand color badge.
 */
export function getBrandColorClass(color: BrandColor): string {
  const colorMap: Record<BrandColor, string> = {
    gray: "bg-gray-500",
    red: "bg-red-500",
    orange: "bg-orange-500",
    yellow: "bg-yellow-500",
    green: "bg-green-500",
    emerald: "bg-emerald-500",
    cyan: "bg-cyan-500",
    sky: "bg-sky-500",
    blue: "bg-blue-500",
    violet: "bg-violet-500",
    fuchsia: "bg-fuchsia-500",
    rose: "bg-rose-500",
  };
  return colorMap[color];
}

/**
 * Get CSS class for a category badge.
 */
export function getCategoryColorClass(category: NewsSourceCategory): string {
  const colorMap: Record<NewsSourceCategory, string> = {
    tech: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    general: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    ai: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    dev: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };
  return colorMap[category];
}

/**
 * Get display label for a category.
 */
export function getCategoryLabel(category: NewsSourceCategory): string {
  const labelMap: Record<NewsSourceCategory, string> = {
    tech: "Tech",
    general: "General",
    ai: "AI",
    dev: "Development",
  };
  return labelMap[category];
}
