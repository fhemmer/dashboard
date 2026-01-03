import { type LucideIcon } from "lucide-react";

/**
 * Unique identifier for each widget in the dashboard.
 * Add new widget IDs here as the dashboard grows.
 */
export type WidgetId = "pull-requests" | "news" | "expenditures" | "timers" | "mail";

/** Valid column span values for widgets */
export type WidgetColspan = 1 | 2;

/** Valid row span values for widgets */
export type WidgetRowspan = 1 | 2 | 3;

/** Layout modes for the dashboard */
export type LayoutMode = "manual" | "auto";

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
  /** Default column span (1-2) */
  defaultColspan?: WidgetColspan;
  /** Default row span (1-3) */
  defaultRowspan?: WidgetRowspan;
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
  /** User-overridden column span (1-2) */
  colspan?: WidgetColspan;
  /** User-overridden row span (1-3) */
  rowspan?: WidgetRowspan;
}

/**
 * The full widget settings stored in the database.
 */
export interface WidgetSettings {
  widgets: WidgetSetting[];
  /** Layout mode: 'manual' (default) preserves order, 'auto' uses dense packing */
  layoutMode?: LayoutMode;
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
    layoutMode: userSettings.layoutMode,
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
    ...settings,
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
    ...settings,
    widgets: settings.widgets.map((w) => ({
      ...w,
      order: orderMap.get(w.id) ?? w.order,
    })),
  };
}

/**
 * Resolved widget with size information from both settings and defaults.
 */
export interface ResolvedWidget extends WidgetSetting {
  colspan: WidgetColspan;
  rowspan: WidgetRowspan;
}

/**
 * Resolves a widget's size by merging user settings with registry defaults.
 */
export function resolveWidgetSize(
  setting: WidgetSetting,
  definition: WidgetDefinition | undefined
): ResolvedWidget {
  return {
    ...setting,
    colspan: setting.colspan ?? definition?.defaultColspan ?? 1,
    rowspan: setting.rowspan ?? definition?.defaultRowspan ?? 1,
  };
}

/**
 * Updates a widget's size settings.
 */
export function updateWidgetSize(
  settings: WidgetSettings,
  widgetId: WidgetId,
  colspan: WidgetColspan,
  rowspan: WidgetRowspan
): WidgetSettings {
  return {
    ...settings,
    widgets: settings.widgets.map((w) =>
      w.id === widgetId ? { ...w, colspan, rowspan } : w
    ),
  };
}

/**
 * Updates the dashboard layout mode.
 */
export function updateLayoutMode(
  settings: WidgetSettings,
  layoutMode: LayoutMode
): WidgetSettings {
  return {
    ...settings,
    layoutMode,
  };
}
