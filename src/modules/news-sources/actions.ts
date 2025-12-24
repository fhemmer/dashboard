"use server";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { revalidatePath } from "next/cache";
import type {
  CreateNewsSourceResult,
  FetchNewsSourcesResult,
  MutationResult,
  NewsSource,
  NewsSourceInput,
  UserRole,
} from "./types";
import { toNewsSource } from "./types";

/**
 * Get the current user's role from their profile.
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    return (data?.role as UserRole) ?? "user";
  } catch {
    return null;
  }
}

/**
 * Check if current user can manage news sources (admin or news_manager).
 */
export async function canManageNewsSources(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === "admin" || role === "news_manager";
}

/**
 * Get all news sources.
 * Admins see all sources (including inactive).
 * Others see only active sources.
 */
export async function getNewsSources(): Promise<FetchNewsSourcesResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { sources: [], error: "Not authenticated" };
    }

    const role = await getCurrentUserRole();

    // Build query - admins see all, others see only active
    let query = supabase.from("news_sources").select("*");

    if (role !== "admin") {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query.order("name", { ascending: true });

    if (error) {
      console.error("Error fetching news sources:", error);
      return { sources: [], error: error.message };
    }

    const sources: NewsSource[] = (data ?? []).map(toNewsSource);
    return { sources, error: null };
  } catch (err) {
    console.error("Error in getNewsSources:", err);
    return {
      sources: [],
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Create a new news source.
 * Admin can create for anyone, news_manager creates with themselves as owner.
 */
export async function createNewsSource(
  input: NewsSourceInput
): Promise<CreateNewsSourceResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const role = await getCurrentUserRole();

    if (role !== "admin" && role !== "news_manager") {
      return { success: false, error: "Permission denied" };
    }

    const { data, error } = await supabase
      .from("news_sources")
      .insert({
        url: input.url,
        name: input.name,
        category: input.category,
        icon_name: input.iconName ?? "blocks",
        brand_color: input.brandColor ?? "gray",
        is_active: input.isActive ?? true,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating news source:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/news-sources");
    revalidatePath("/news");
    return { success: true, error: null, id: data.id };
  } catch (err) {
    console.error("Error in createNewsSource:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Update an existing news source.
 * Admin can update any source, news_manager can only update their own.
 */
export async function updateNewsSource(
  id: string,
  input: Partial<NewsSourceInput>
): Promise<MutationResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const role = await getCurrentUserRole();

    if (role !== "admin" && role !== "news_manager") {
      return { success: false, error: "Permission denied" };
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (input.url !== undefined) updateData.url = input.url;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.iconName !== undefined) updateData.icon_name = input.iconName;
    if (input.brandColor !== undefined) updateData.brand_color = input.brandColor;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;

    // Build query based on role
    let query = supabase.from("news_sources").update(updateData).eq("id", id);

    // News managers can only update their own sources
    if (role === "news_manager") {
      query = query.eq("created_by", user.id);
    }

    const { error } = await query;

    if (error) {
      console.error("Error updating news source:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/news-sources");
    revalidatePath("/news");
    return { success: true, error: null };
  } catch (err) {
    console.error("Error in updateNewsSource:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Delete a news source.
 * Admin can delete any source, news_manager can only delete their own.
 */
export async function deleteNewsSource(id: string): Promise<MutationResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const role = await getCurrentUserRole();

    if (role !== "admin" && role !== "news_manager") {
      return { success: false, error: "Permission denied" };
    }

    // Build query based on role
    let query = supabase.from("news_sources").delete().eq("id", id);

    // News managers can only delete their own sources
    if (role === "news_manager") {
      query = query.eq("created_by", user.id);
    }

    const { error } = await query;

    if (error) {
      console.error("Error deleting news source:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/news-sources");
    revalidatePath("/news");
    return { success: true, error: null };
  } catch (err) {
    console.error("Error in deleteNewsSource:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Toggle a news source's active status.
 */
export async function toggleNewsSourceActive(
  id: string,
  isActive: boolean
): Promise<MutationResult> {
  return updateNewsSource(id, { isActive });
}

/**
 * Get a system setting value.
 */
export async function getSystemSetting(
  key: string
): Promise<{ value: unknown; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { value: null, error: "Not authenticated" };
    }

    const role = await getCurrentUserRole();

    if (role !== "admin") {
      return { value: null, error: "Permission denied" };
    }

    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", key)
      .single();

    if (error) {
      console.error("Error fetching system setting:", error);
      return { value: null, error: error.message };
    }

    return { value: data?.value ?? null, error: null };
  } catch (err) {
    console.error("Error in getSystemSetting:", err);
    return {
      value: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Update a system setting value.
 */
export async function updateSystemSetting(
  key: string,
  value: unknown
): Promise<MutationResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const role = await getCurrentUserRole();

    if (role !== "admin") {
      return { success: false, error: "Permission denied" };
    }

    const { error } = await supabase
      .from("system_settings")
      .upsert({
        key,
        value: value as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("key", key);

    if (error) {
      console.error("Error updating system setting:", error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("Error in updateSystemSetting:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Get all system settings for admin.
 */
export async function getSystemSettings(): Promise<{
  fetchIntervalMinutes: number;
  notificationRetentionDays: number;
  lastFetchAt: string | null;
  error: string | null;
}> {
  const defaultResult = {
    fetchIntervalMinutes: 30,
    notificationRetentionDays: 30,
    lastFetchAt: null,
    error: null,
  };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ...defaultResult, error: "Not authenticated" };
    }

    const role = await getCurrentUserRole();

    if (role !== "admin") {
      return { ...defaultResult, error: "Permission denied" };
    }

    const { data, error } = await supabase.from("system_settings").select("*");

    if (error) {
      console.error("Error fetching system settings:", error);
      return { ...defaultResult, error: error.message };
    }

    const settings = (data ?? []).reduce(
      (acc, row) => {
        acc[row.key] = row.value;
        return acc;
      },
      {} as Record<string, unknown>
    );

    return {
      fetchIntervalMinutes:
        typeof settings.fetch_interval_minutes === "number"
          ? settings.fetch_interval_minutes
          : 30,
      notificationRetentionDays:
        typeof settings.notification_retention_days === "number"
          ? settings.notification_retention_days
          : 30,
      lastFetchAt:
        typeof settings.last_fetch_at === "string" ? settings.last_fetch_at : null,
      error: null,
    };
  } catch (err) {
    console.error("Error in getSystemSettings:", err);
    return {
      ...defaultResult,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
