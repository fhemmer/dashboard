"use server";

import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import {
    getAvailableWidgets,
    mergeWidgetSettings,
    type LayoutMode,
    type WidgetHeight,
    type WidgetId,
    type WidgetSettings,
    type WidgetWidth,
} from "@/lib/widgets";
import { revalidatePath } from "next/cache";

export interface DashboardSettingsResult {
  settings: WidgetSettings;
  isAdmin: boolean;
  error?: string;
}

/**
 * Get the current user's widget settings, merged with available widgets.
 */
export async function getWidgetSettings(): Promise<DashboardSettingsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      settings: { widgets: [] },
      isAdmin: false,
      error: "Not authenticated",
    };
  }

  // Check if user is admin
  const { data: isAdmin } = await supabase.rpc("is_admin");
  const adminStatus = isAdmin === true;

  // Get available widgets based on admin status
  const availableWidgets = getAvailableWidgets(adminStatus);

  // Get user's stored settings
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("widget_settings")
    .eq("id", user.id)
    .single();

  if (error) {
    // Profile doesn't exist yet, return defaults
    return {
      settings: mergeWidgetSettings(null, availableWidgets),
      isAdmin: adminStatus,
    };
  }

  // Merge stored settings with available widgets
  const storedSettings = profile?.widget_settings as WidgetSettings | null;
  const mergedSettings = mergeWidgetSettings(storedSettings, availableWidgets);

  return {
    settings: mergedSettings,
    isAdmin: adminStatus,
  };
}

/**
 * Update widget visibility (enabled/disabled).
 */
export async function updateWidgetVisibility(
  widgetId: WidgetId,
  enabled: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get current settings
  const { settings } = await getWidgetSettings();

  // Update the specific widget
  const updatedWidgets = settings.widgets.map((w) =>
    w.id === widgetId ? { ...w, enabled } : w
  );

  const widgetSettingsJson = {
    ...settings,
    widgets: updatedWidgets,
  } as unknown as Json;

  const { error } = await supabase
    .from("profiles")
    .update({
      widget_settings: widgetSettingsJson,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return {};
}

/**
 * Update widget order after drag-and-drop.
 */
export async function updateWidgetOrder(
  orderedWidgetIds: WidgetId[]
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get current settings
  const { settings } = await getWidgetSettings();

  // Create order map from the new order
  const orderMap = new Map(orderedWidgetIds.map((id, index) => [id, index]));

  // Update order for all widgets
  const updatedWidgets = settings.widgets.map((w) => ({
    ...w,
    order: orderMap.get(w.id) ?? w.order,
  }));

  const widgetSettingsJson = {
    ...settings,
    widgets: updatedWidgets,
  } as unknown as Json;

  const { error } = await supabase
    .from("profiles")
    .update({
      widget_settings: widgetSettingsJson,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return {};
}

/**
 * Reset widget settings to defaults.
 */
export async function resetWidgetSettings(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      widget_settings: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return {};
}

/**
 * Update widget size (width and height).
 */
export async function updateWidgetSize(
  widgetId: WidgetId,
  width: WidgetWidth,
  height: WidgetHeight
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Validate size values (1-6 for flexible grid)
  if (width < 1 || width > 6 || height < 1 || height > 6) {
    return { error: "Invalid size values" };
  }

  // Get current settings
  const { settings } = await getWidgetSettings();

  // Update the specific widget's size
  const updatedWidgets = settings.widgets.map((w) =>
    w.id === widgetId ? { ...w, width, height, colspan: undefined, rowspan: undefined } : w
  );

  const widgetSettingsJson = {
    ...settings,
    widgets: updatedWidgets,
  } as unknown as Json;

  const { error } = await supabase
    .from("profiles")
    .update({
      widget_settings: widgetSettingsJson,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return {};
}

/**
 * Update dashboard layout mode (manual or auto).
 */
export async function updateLayoutMode(
  layoutMode: LayoutMode
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Validate layout mode
  if (!["manual", "auto"].includes(layoutMode)) {
    return { error: "Invalid layout mode" };
  }

  // Get current settings
  const { settings } = await getWidgetSettings();

  const widgetSettingsJson = {
    ...settings,
    layoutMode,
  } as unknown as Json;

  const { error } = await supabase
    .from("profiles")
    .update({
      widget_settings: widgetSettingsJson,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return {};
}
