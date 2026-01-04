import { type LucideIcon } from "lucide-react";

/**
 * Unique identifier for each widget in the dashboard.
 * Add new widget IDs here as the dashboard grows.
 */
export type WidgetId = "pull-requests" | "news" | "expenditures" | "timers" | "mail";

/** Valid width values for widgets (in grid units) */
export type WidgetWidth = 1 | 2 | 3 | 4 | 5 | 6;

/** Valid height values for widgets (in grid units) */
export type WidgetHeight = 1 | 2 | 3 | 4 | 5 | 6;

/** @deprecated Use WidgetWidth instead */
export type WidgetColspan = 1 | 2;

/** @deprecated Use WidgetHeight instead */
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
  /** Minimum width in grid units (default: 1) */
  minWidth?: WidgetWidth;
  /** Minimum height in grid units (default: 1) */
  minHeight?: WidgetHeight;
  /** Default width in grid units */
  defaultWidth?: WidgetWidth;
  /** Default height in grid units */
  defaultHeight?: WidgetHeight;
  /** @deprecated Use defaultWidth instead */
  defaultColspan?: WidgetColspan;
  /** @deprecated Use defaultHeight instead */
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
  /** User-preferred width in grid units */
  width?: WidgetWidth;
  /** User-preferred height in grid units */
  height?: WidgetHeight;
  /** @deprecated Use width instead */
  colspan?: WidgetColspan;
  /** @deprecated Use height instead */
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
  /** Resolved width (from user settings or defaults) */
  width: WidgetWidth;
  /** Resolved height (from user settings or defaults) */
  height: WidgetHeight;
  /** Minimum width constraint from registry */
  minWidth: WidgetWidth;
  /** Minimum height constraint from registry */
  minHeight: WidgetHeight;
  /** @deprecated Use width instead */
  colspan: WidgetColspan;
  /** @deprecated Use height instead */
  rowspan: WidgetRowspan;
}

/**
 * Resolves a widget's size by merging user settings with registry defaults.
 */
export function resolveWidgetSize(
  setting: WidgetSetting,
  definition: WidgetDefinition | undefined
): ResolvedWidget {
  const minWidth = definition?.minWidth ?? 1;
  const minHeight = definition?.minHeight ?? 1;
  
  // Resolve width: user setting -> default -> minWidth
  const rawWidth = setting.width ?? setting.colspan ?? definition?.defaultWidth ?? definition?.defaultColspan ?? minWidth;
  const width = Math.max(rawWidth, minWidth) as WidgetWidth;
  
  // Resolve height: user setting -> default -> minHeight
  const rawHeight = setting.height ?? setting.rowspan ?? definition?.defaultHeight ?? definition?.defaultRowspan ?? minHeight;
  const height = Math.max(rawHeight, minHeight) as WidgetHeight;
  
  return {
    ...setting,
    width,
    height,
    minWidth,
    minHeight,
    // Deprecated fields for backward compatibility
    colspan: Math.min(width, 2) as WidgetColspan,
    rowspan: Math.min(height, 3) as WidgetRowspan,
  };
}

/**
 * Updates a widget's size settings.
 */
export function updateWidgetSize(
  settings: WidgetSettings,
  widgetId: WidgetId,
  width: WidgetWidth,
  height: WidgetHeight
): WidgetSettings {
  return {
    ...settings,
    widgets: settings.widgets.map((w) =>
      w.id === widgetId ? { ...w, width, height, colspan: undefined, rowspan: undefined } : w
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

/**
 * A row of widgets with uniform height.
 */
export interface WidgetRow {
  /** Height of this row in grid units */
  height: WidgetHeight;
  /** Widgets in this row, with their calculated widths */
  widgets: RowWidget[];
}

/**
 * A widget positioned in a row with calculated width.
 */
export interface RowWidget extends ResolvedWidget {
  /** Calculated width for this row (may be expanded to fill row) */
  calculatedWidth: number;
}

/**
 * Organizes widgets into rows with uniform heights.
 * In Auto mode: balances widgets into rows where all widgets share the same height.
 * In Manual mode: preserves widget order and packs into rows.
 * 
 * @param widgets - Resolved widgets to organize
 * @param gridColumns - Total number of grid columns available
 * @param layoutMode - 'auto' for balanced rows, 'manual' for ordered packing
 * @returns Array of rows with widgets
 */
export function organizeWidgetsIntoRows(
  widgets: ResolvedWidget[],
  gridColumns: number,
  layoutMode: LayoutMode = "auto"
): WidgetRow[] {
  if (widgets.length === 0) return [];

  if (layoutMode === "auto") {
    return organizeAutoLayout(widgets, gridColumns);
  }
  return organizeManualLayout(widgets, gridColumns);
}

/**
 * Auto layout: Groups widgets by height, then fills rows.
 */
function organizeAutoLayout(
  widgets: ResolvedWidget[],
  gridColumns: number
): WidgetRow[] {
  const rows: WidgetRow[] = [];
  
  // Group widgets by their preferred height
  const byHeight = new Map<WidgetHeight, ResolvedWidget[]>();
  for (const widget of widgets) {
    const existing = byHeight.get(widget.height) ?? [];
    existing.push(widget);
    byHeight.set(widget.height, existing);
  }
  
  // Process heights from tallest to shortest for visual appeal
  const heights = [...byHeight.keys()].sort((a, b) => b - a);
  
  for (const height of heights) {
    const widgetsAtHeight = byHeight.get(height)!;
    let currentRowWidgets: ResolvedWidget[] = [];
    let currentRowWidth = 0;
    
    for (const widget of widgetsAtHeight) {
      const widgetWidth = Math.min(widget.width, gridColumns);
      
      if (currentRowWidth + widgetWidth > gridColumns && currentRowWidgets.length > 0) {
        // Current row is full, create it and start a new one
        rows.push(createRow(currentRowWidgets, gridColumns, height));
        currentRowWidgets = [];
        currentRowWidth = 0;
      }
      
      currentRowWidgets.push(widget);
      currentRowWidth += widgetWidth;
    }
    
    // Don't forget the last row
    if (currentRowWidgets.length > 0) {
      rows.push(createRow(currentRowWidgets, gridColumns, height));
    }
  }
  
  return rows;
}

/**
 * Manual layout: Preserves widget order, packs into rows.
 */
function organizeManualLayout(
  widgets: ResolvedWidget[],
  gridColumns: number
): WidgetRow[] {
  const rows: WidgetRow[] = [];
  let currentRowWidgets: ResolvedWidget[] = [];
  let currentRowWidth = 0;
  let currentRowHeight: WidgetHeight = 1;
  
  for (const widget of widgets) {
    const widgetWidth = Math.min(widget.width, gridColumns);
    
    // Check if widget fits in current row
    if (currentRowWidth + widgetWidth > gridColumns && currentRowWidgets.length > 0) {
      // Create the current row
      rows.push(createRow(currentRowWidgets, gridColumns, currentRowHeight));
      currentRowWidgets = [];
      currentRowWidth = 0;
      currentRowHeight = widget.height;
    }
    
    currentRowWidgets.push(widget);
    currentRowWidth += widgetWidth;
    // Row height is the maximum height of widgets in the row
    currentRowHeight = Math.max(currentRowHeight, widget.height) as WidgetHeight;
  }
  
  // Don't forget the last row
  if (currentRowWidgets.length > 0) {
    rows.push(createRow(currentRowWidgets, gridColumns, currentRowHeight));
  }
  
  return rows;
}

/**
 * Creates a row with widgets, expanding widths proportionally to fill the row.
 */
function createRow(
  widgets: ResolvedWidget[],
  gridColumns: number,
  height: WidgetHeight
): WidgetRow {
  const totalRequestedWidth = widgets.reduce((sum, w) => sum + Math.min(w.width, gridColumns), 0);
  const extraSpace = gridColumns - totalRequestedWidth;
  
  // Distribute extra space proportionally
  const rowWidgets: RowWidget[] = widgets.map((widget, index) => {
    const baseWidth = Math.min(widget.width, gridColumns);
    // Distribute extra space to widgets (last widget gets remainder)
    const extraPerWidget = Math.floor(extraSpace / widgets.length);
    const isLast = index === widgets.length - 1;
    const remainder = isLast ? extraSpace - extraPerWidget * widgets.length : 0;
    const calculatedWidth = baseWidth + extraPerWidget + remainder;
    
    return {
      ...widget,
      calculatedWidth: Math.max(calculatedWidth, widget.minWidth),
    };
  });
  
  return { height, widgets: rowWidgets };
}
