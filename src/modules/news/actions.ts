"use server";

import { createClient } from "@/lib/supabase/server";
import type { BrandColor, NewsSourceCategory, SourceIcon } from "@/modules/news-sources";
import { revalidatePath } from "next/cache";
import type {
    FetchNewsItemsResult,
    FetchSourcesWithExclusionResult,
    NewsItem,
    NewsSourceWithExclusion,
} from "./types";

/**
 * Get news items from the database, excluding sources the user has opted out of.
 * Uses database-level filtering for efficiency.
 */
export async function getNewsItems(): Promise<FetchNewsItemsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Build the query to get news items with source info
  // We'll filter out excluded sources at the application level since
  // Supabase doesn't support LEFT JOIN with null check in RLS easily
  const { data: newsData, error: newsError } = await supabase
    .from("news_items")
    .select(
      `
      id,
      title,
      summary,
      link,
      image_url,
      published_at,
      source_id,
      news_sources (
        id,
        name,
        icon_name,
        brand_color,
        category
      )
    `
    )
    .order("published_at", { ascending: false })
    .limit(100);

  if (newsError) {
    console.error("Failed to fetch news items:", newsError);
    return { items: [], error: newsError.message };
  }

  // Get user's excluded sources if authenticated
  let excludedSourceIds: Set<string> = new Set();
  if (user) {
    const { data: exclusions } = await supabase
      .from("user_news_source_exclusions")
      .select("source_id")
      .eq("user_id", user.id);

    if (exclusions) {
      excludedSourceIds = new Set(exclusions.map((e) => e.source_id));
    }
  }

  // Transform and filter the results
  const items: NewsItem[] = (newsData ?? [])
    .filter((item) => {
      // Filter out items from excluded sources
      return !excludedSourceIds.has(item.source_id);
    })
    .filter((item) => {
      // Filter out items without valid source data
      return item.news_sources !== null;
    })
    .map((item) => {
      const source = item.news_sources as {
        id: string;
        name: string;
        icon_name: string;
        brand_color: string;
        category: string;
      };

      return {
        id: item.id,
        title: item.title,
        summary: item.summary,
        url: item.link,
        imageUrl: item.image_url,
        publishedAt: new Date(item.published_at),
        source: {
          id: source.id,
          name: source.name,
          iconName: source.icon_name as SourceIcon,
          brandColor: source.brand_color as BrandColor,
          category: source.category as NewsSourceCategory,
        },
      };
    });

  return { items, error: null };
}

/**
 * Get all active news sources with exclusion status for the current user.
 */
export async function getSourcesWithExclusion(): Promise<FetchSourcesWithExclusionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get all active sources
  const { data: sources, error: sourcesError } = await supabase
    .from("news_sources")
    .select("id, name, icon_name, brand_color, category")
    .eq("is_active", true)
    .order("name");

  if (sourcesError) {
    console.error("Failed to fetch news sources:", sourcesError);
    return { sources: [], error: sourcesError.message };
  }

  // Get user's excluded sources if authenticated
  let excludedSourceIds: Set<string> = new Set();
  if (user) {
    const { data: exclusions } = await supabase
      .from("user_news_source_exclusions")
      .select("source_id")
      .eq("user_id", user.id);

    if (exclusions) {
      excludedSourceIds = new Set(exclusions.map((e) => e.source_id));
    }
  }

  // Transform sources with exclusion status
  const sourcesWithExclusion: NewsSourceWithExclusion[] = (sources ?? []).map(
    (source) => ({
      id: source.id,
      name: source.name,
      iconName: source.icon_name as SourceIcon,
      brandColor: source.brand_color as BrandColor,
      category: source.category as NewsSourceCategory,
      isExcluded: excludedSourceIds.has(source.id),
    })
  );

  return { sources: sourcesWithExclusion, error: null };
}

/**
 * Get the list of source IDs the user has excluded.
 */
export async function getUserExcludedSources(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: exclusions } = await supabase
    .from("user_news_source_exclusions")
    .select("source_id")
    .eq("user_id", user.id);

  return exclusions?.map((e) => e.source_id) ?? [];
}

/**
 * Toggle a source's exclusion status for the current user.
 */
export async function toggleSourceExclusion(
  sourceId: string
): Promise<{ success: boolean; isExcluded: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, isExcluded: false };
  }

  // Check if currently excluded
  const { data: existing } = await supabase
    .from("user_news_source_exclusions")
    .select("source_id")
    .eq("user_id", user.id)
    .eq("source_id", sourceId)
    .single();

  if (existing) {
    // Remove exclusion
    const { error } = await supabase
      .from("user_news_source_exclusions")
      .delete()
      .eq("user_id", user.id)
      .eq("source_id", sourceId);

    if (error) {
      console.error("Failed to remove source exclusion:", error);
      return { success: false, isExcluded: true };
    }

    revalidatePath("/news");
    return { success: true, isExcluded: false };
  } else {
    // Add exclusion
    const { error } = await supabase
      .from("user_news_source_exclusions")
      .insert({ user_id: user.id, source_id: sourceId });

    if (error) {
      console.error("Failed to add source exclusion:", error);
      return { success: false, isExcluded: false };
    }

    revalidatePath("/news");
    return { success: true, isExcluded: true };
  }
}

/**
 * Exclude a source for the current user.
 */
export async function excludeSource(
  sourceId: string
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false };
  }

  const { error } = await supabase
    .from("user_news_source_exclusions")
    .upsert({ user_id: user.id, source_id: sourceId });

  if (error) {
    console.error("Failed to exclude source:", error);
    return { success: false };
  }

  revalidatePath("/news");
  return { success: true };
}

/**
 * Include a source for the current user (remove exclusion).
 */
export async function includeSource(
  sourceId: string
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false };
  }

  const { error } = await supabase
    .from("user_news_source_exclusions")
    .delete()
    .eq("user_id", user.id)
    .eq("source_id", sourceId);

  if (error) {
    console.error("Failed to include source:", error);
    return { success: false };
  }

  revalidatePath("/news");
  return { success: true };
}

export async function revalidateNews(): Promise<void> {
  revalidatePath("/news");
}

export async function getNewsLastSeenAt(): Promise<Date | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from("profiles")
    .select("news_last_seen_at")
    .eq("id", user.id)
    .single();

  return data?.news_last_seen_at ? new Date(data.news_last_seen_at) : null;
}

export async function markNewsAsRead(): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ news_last_seen_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    console.error("Failed to mark news as read:", error);
    return { success: false };
  }

  revalidatePath("/news");
  return { success: true };
}
