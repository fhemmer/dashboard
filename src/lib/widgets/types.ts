import { type LucideIcon } from "lucide-react";

/**
 * Unique identifier for each widget in the dashboard.
 * Add new widget IDs here as the dashboard grows.
 */
export type WidgetId = "pull-requests" | "news" | "expenditures" | "timers" | "mail";

/**
 * Widget metadata for the registry.
 */
export interface WidgetDefinition {
  /** Unique identifier for the widget */
  id: WidgetId;
  /** Display name shown in settings UI */
  name: string;
  /** Short description of what the widget shows */
  description: string;
  /** Icon component from lucide-react */
  icon: LucideIcon;
  /** Whether this widget is available to all users or requires special access */
  requiresAdmin?: boolean;
  /** Default enabled state for new users */
  defaultEnabled: boolean;
}

/**
 * User's settings for a single widget.
 */
export interface WidgetSetting {
  /** The widget identifier */
  id: WidgetId;
  /** Whether the widget is visible on the dashboard */
  enabled: boolean;
  /** Display order (lower = earlier in the grid) */
  order: number;
}

/**
 * The full widget settings stored in the database.
 */
export interface WidgetSettings {
  widgets: WidgetSetting[];
}

/**
 * Default widget settings for new users.
 * All widgets enabled, ordered as they appear in the registry.
 */
export function getDefaultWidgetSettings(
  availableWidgets: WidgetDefinition[]
): WidgetSettings {
  return {
    widgets: availableWidgets.map((widget, index) => ({
      id: widget.id,
      enabled: widget.defaultEnabled,
      order: index,
    })),
  };
}

/**
 * Merges user settings with the registry to handle new widgets.
 * New widgets are added with their default settings at the end.
 */
export function mergeWidgetSettings(
  userSettings: WidgetSettings | null,
  availableWidgets: WidgetDefinition[]
): WidgetSettings {
  if (!userSettings) {
    return getDefaultWidgetSettings(availableWidgets);
  }

  const existingIds = new Set(userSettings.widgets.map((w) => w.id));
  const maxOrder = Math.max(...userSettings.widgets.map((w) => w.order), -1);

  // Add any new widgets that don't exist in user settings
  const newWidgets: WidgetSetting[] = availableWidgets
    .filter((w) => !existingIds.has(w.id))
    .map((widget, index) => ({
      id: widget.id,
      enabled: widget.defaultEnabled,
      order: maxOrder + index + 1,
    }));

  // Filter out widgets that no longer exist in the registry
  const validWidgetIds = new Set(availableWidgets.map((w) => w.id));
  const validUserWidgets = userSettings.widgets.filter((w) =>
    validWidgetIds.has(w.id)
  );

  return {
    widgets: [...validUserWidgets, ...newWidgets].sort(
      (a, b) => a.order - b.order
    ),
  };
}

/**
 * Gets the enabled widgets in their display order.
 */
export function getEnabledWidgets(settings: WidgetSettings): WidgetSetting[] {
  return settings.widgets
    .filter((w) => w.enabled)
    .sort((a, b) => a.order - b.order);
}

/**
 * Updates a widget's enabled state.
 */
export function toggleWidget(
  settings: WidgetSettings,
  widgetId: WidgetId,
  enabled: boolean
): WidgetSettings {
  return {
    widgets: settings.widgets.map((w) =>
      w.id === widgetId ? { ...w, enabled } : w
    ),
  };
}

/**
 * Reorders widgets based on new order array.
 */
export function reorderWidgets(
  settings: WidgetSettings,
  newOrder: WidgetId[]
): WidgetSettings {
  const orderMap = new Map(newOrder.map((id, index) => [id, index]));

  return {
    widgets: settings.widgets.map((w) => ({
      ...w,
      order: orderMap.get(w.id) ?? w.order,
    })),
  };
}
