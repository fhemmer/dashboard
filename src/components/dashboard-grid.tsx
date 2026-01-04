"use client";

import { updateWidgetOrder } from "@/app/actions.dashboard";
import type {
    ResolvedWidget,
    WidgetHeight,
    WidgetId,
    WidgetSettings,
} from "@/lib/widgets";
import { organizeWidgetsIntoRows, resolveWidgetSize, WIDGET_REGISTRY } from "@/lib/widgets";
import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    type DragStartEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    arrayMove,
    rectSortingStrategy,
    SortableContext,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type ReactNode, useEffect, useState, useTransition } from "react";

/** Grid column count at different breakpoints */
const GRID_COLUMNS = {
  sm: 2,
  lg: 3,
  xl: 4,
};

/** Maps width values to Tailwind grid column span classes */
function getWidthClass(width: number): string {
  const classes: Record<number, string> = {
    1: "col-span-1",
    2: "col-span-2",
    3: "col-span-3",
    4: "col-span-4",
    5: "col-span-5",
    6: "col-span-6",
  };
  return classes[width] ?? "col-span-1";
}

/** Maps height values to row height CSS variable */
function getRowStyle(height: WidgetHeight): React.CSSProperties {
  // Each row unit is 180px for consistent sizing
  return {
    "--row-height": `${height * 180}px`,
  } as React.CSSProperties;
}

interface SortableWidgetWrapperProps {
  id: WidgetId;
  children: ReactNode;
  isDragMode: boolean;
  width: number;
}

function SortableWidgetWrapper({
  id,
  children,
  isDragMode,
  width,
}: SortableWidgetWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative transition-all duration-200 h-full
        ${getWidthClass(width)}
        ${isDragging ? "z-50 scale-[1.02]" : ""}
        ${isDragMode ? "cursor-grab active:cursor-grabbing" : ""}
      `}
      {...(isDragMode ? { ...attributes, ...listeners } : {})}
    >
      {/* Overlay when dragging */}
      {isDragging && (
        <div className="absolute inset-0 rounded-lg bg-primary/5 border-2 border-dashed border-primary/30 pointer-events-none" />
      )}
      {children}
    </div>
  );
}

interface DashboardGridProps {
  settings: WidgetSettings;
  widgetComponents: Record<WidgetId, ReactNode>;
}

export function DashboardGrid({
  settings,
  widgetComponents,
}: DashboardGridProps) {
  const [isPending, startTransition] = useTransition();
  const [localSettings, setLocalSettings] = useState(settings);
  const [isDragMode, setIsDragMode] = useState(false);

  // Sync local state when props change (e.g., after router.refresh())
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Get enabled widgets sorted by order and resolve their sizes
  const enabledWidgets: ResolvedWidget[] = [...localSettings.widgets]
    .filter((w) => w.enabled)
    .sort((a, b) => a.order - b.order)
    .map((w) => resolveWidgetSize(w, WIDGET_REGISTRY[w.id]));

  const widgetIds = enabledWidgets.map((w) => w.id);
  const layoutMode = localSettings.layoutMode ?? "auto";
  
  // Organize widgets into rows (using xl breakpoint columns for now)
  const rows = organizeWidgetsIntoRows(enabledWidgets, GRID_COLUMNS.xl, layoutMode);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor)
  );

  function handleDragStart(_event: DragStartEvent) {
    setIsDragMode(true);
  }

  function handleDragEnd(event: DragEndEvent) {
    setIsDragMode(false);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const currentWidgetIds = enabledWidgets.map((w) => w.id);
      const oldIndex = currentWidgetIds.indexOf(active.id as WidgetId);
      const newIndex = currentWidgetIds.indexOf(over.id as WidgetId);
      const newOrder = arrayMove(currentWidgetIds, oldIndex, newIndex);

      // Build full order including disabled widgets
      const disabledWidgets = localSettings.widgets.filter((w) => !w.enabled);
      const fullOrder = [
        ...newOrder,
        ...disabledWidgets.map((w) => w.id),
      ];

      // Optimistic update
      setLocalSettings((prev) => ({
        ...prev,
        widgets: prev.widgets.map((w) => ({
          ...w,
          order: fullOrder.indexOf(w.id),
        })),
      }));

      startTransition(() => {
        performOrderUpdate(fullOrder);
      });
    }
  }

  async function performOrderUpdate(fullOrder: WidgetId[]) {
    const result = await updateWidgetOrder(fullOrder);
    if (result.error) {
      // Revert on error
      setLocalSettings(settings);
    }
  }

  function handleDragCancel() {
    setIsDragMode(false);
  }

  if (enabledWidgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <svg
            className="h-8 w-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
            />
          </svg>
        </div>
        <h3 className="font-medium text-lg mb-1">No widgets enabled</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Click the Configure button above to enable widgets and customize your
          dashboard.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
        <div className={`flex flex-col gap-4 ${isPending ? "opacity-70 pointer-events-none" : ""}`}>
          {rows.map((row, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              style={getRowStyle(row.height)}
            >
              {row.widgets.map((widget) => {
                const component = widgetComponents[widget.id];
                if (!component) return null;

                return (
                  <SortableWidgetWrapper
                    key={widget.id}
                    id={widget.id}
                    isDragMode={isDragMode}
                    width={widget.calculatedWidth}
                  >
                    <div className="h-[var(--row-height)]">{component}</div>
                  </SortableWidgetWrapper>
                );
              })}
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
