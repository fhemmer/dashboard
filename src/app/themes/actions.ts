"use server";

import { parseThemeVariablesFromJson, type ThemeVariables } from "@/lib/theme-utils";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import type { UserTheme } from "@/modules/themes/types";
import { revalidatePath } from "next/cache";

export interface ThemeActionResult {
  success: boolean;
  error?: string;
  theme?: UserTheme;
}

// Database row type for user_themes
interface UserThemeRow {
  id: string;
  user_id: string;
  name: string;
  light_variables: Json;
  dark_variables: Json;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

function rowToUserTheme(row: UserThemeRow): UserTheme {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    light_variables: parseThemeVariablesFromJson(row.light_variables as Record<string, unknown>),
    dark_variables: parseThemeVariablesFromJson(row.dark_variables as Record<string, unknown>),
    is_active: row.is_active ?? false,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  };
}

/**
 * Get all custom themes for the current user
 */
export async function getUserThemes(): Promise<UserTheme[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_themes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user themes:", error);
    return [];
  }

  return (data ?? []).map((row) => rowToUserTheme(row as UserThemeRow));
}

/**
 * Get a single custom theme by ID
 */
export async function getThemeById(id: string): Promise<UserTheme | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_themes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return rowToUserTheme(data as UserThemeRow);
}

/**
 * Get the currently active custom theme for the user
 */
export async function getActiveCustomTheme(): Promise<UserTheme | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_themes")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return null;
  }

  return rowToUserTheme(data as UserThemeRow);
}

/**
 * Create a new custom theme
 */
export async function createTheme(
  name: string,
  lightVariables: ThemeVariables,
  darkVariables: ThemeVariables
): Promise<ThemeActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check for duplicate name
  const { data: existing } = await supabase
    .from("user_themes")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", name)
    .single();

  if (existing) {
    return { success: false, error: "A theme with this name already exists" };
  }

  const { data, error } = await supabase
    .from("user_themes" as never)
    .insert({
      user_id: user.id,
      name,
      light_variables: lightVariables as unknown as Record<string, unknown>,
      dark_variables: darkVariables as unknown as Record<string, unknown>,
      is_active: false,
    } as never)
    .select()
    .single();

  if (error) {
    console.error("Error creating theme:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/themes");

  return {
    success: true,
    theme: rowToUserTheme(data as UserThemeRow),
  };
}

/**
 * Update an existing theme
 */
export async function updateTheme(
  id: string,
  name?: string,
  lightVariables?: ThemeVariables,
  darkVariables?: ThemeVariables
): Promise<ThemeActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // If renaming, check for duplicate
  if (name) {
    const { data: existing } = await supabase
      .from("user_themes")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", name)
      .neq("id", id)
      .single();

    if (existing) {
      return { success: false, error: "A theme with this name already exists" };
    }
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (lightVariables !== undefined)
    updates.light_variables = lightVariables as unknown as Record<string, unknown>;
  if (darkVariables !== undefined)
    updates.dark_variables = darkVariables as unknown as Record<string, unknown>;

  const { data, error } = await supabase
    .from("user_themes")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating theme:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/themes");

  return {
    success: true,
    theme: rowToUserTheme(data as UserThemeRow),
  };
}

/**
 * Delete a theme
 */
export async function deleteTheme(id: string): Promise<ThemeActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("user_themes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting theme:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/themes");
  return { success: true };
}

/**
 * Set a theme as the active custom theme
 */
export async function setActiveTheme(id: string | null): Promise<ThemeActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // First deactivate all themes for this user
  await supabase.from("user_themes").update({ is_active: false }).eq("user_id", user.id);

  // If id is null, we just want to deactivate (switch to preset theme)
  if (!id) {
    revalidatePath("/themes");
    return { success: true };
  }

  // Activate the selected theme
  const { data, error } = await supabase
    .from("user_themes")
    .update({ is_active: true })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Error activating theme:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/themes");

  return {
    success: true,
    theme: rowToUserTheme(data as UserThemeRow),
  };
}
