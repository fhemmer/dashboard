"use client";

import {
    updateLayoutMode,
    updateWidgetOrder,
    updateWidgetSize,
    updateWidgetVisibility,
} from "@/app/actions.dashboard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
    getWidgetById,
    WIDGET_REGISTRY,
    resolveWidgetSize,
    type LayoutMode,
    type WidgetHeight,
    type WidgetId,
    type WidgetSettings,
    type WidgetWidth,
} from "@/lib/widgets";
import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical, LayoutGrid, Loader2, Maximize2, Minimize2, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

interface SortableWidgetItemProps {
  id: WidgetId;
  enabled: boolean;
  width: WidgetWidth;
  height: WidgetHeight;
  minWidth: WidgetWidth;
  minHeight: WidgetHeight;
  onToggle: (id: WidgetId, enabled: boolean) => void;
  onSizeChange: (id: WidgetId, width: WidgetWidth, height: WidgetHeight) => void;
  isPending: boolean;
}

/** Size control with up/down buttons */
function SizeControl({
  label,
  value,
  min,
  max = 6,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max?: number;
  onChange: (value: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground w-6">{label}:</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 p-0"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        title={`Decrease ${label.toLowerCase()}`}
      >
        <ChevronDown className="h-3 w-3" />
      </Button>
      <span className="text-xs font-medium w-4 text-center tabular-nums">{value}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 p-0"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        title={`Increase ${label.toLowerCase()}`}
      >
        <ChevronUp className="h-3 w-3" />
      </Button>
    </div>
  );
}

function SortableWidgetItem({
  id,
  enabled,
  width,
  height,
  minWidth,
  minHeight,
  onToggle,
  onSizeChange,
  isPending,
}: SortableWidgetItemProps) {
  const widget = getWidgetById(id);
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

  if (!widget) return null;

  const Icon = widget.icon;
  const isMaxSize = width >= 4 && height >= 4;
  const isMinSize = width === minWidth && height === minHeight;

  function handleExpand() {
    onSizeChange(id, Math.max(4, minWidth) as WidgetWidth, Math.max(4, minHeight) as WidgetHeight);
  }

  function handleShrink() {
    onSizeChange(id, minWidth, minHeight);
  }

  function handleWidthChange(newWidth: number) {
    onSizeChange(id, newWidth as WidgetWidth, height);
  }

  function handleHeightChange(newHeight: number) {
    onSizeChange(id, width, newHeight as WidgetHeight);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group flex flex-col gap-2 rounded-lg border p-3
        bg-card transition-all duration-200
        ${isDragging ? "z-50 shadow-lg ring-2 ring-primary/20 scale-[1.02]" : ""}
        ${enabled ? "border-border" : "border-dashed border-muted-foreground/30 opacity-60"}
      `}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <button
          type="button"
          className="touch-none cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted transition-colors"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${widget.name}`}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Widget Icon */}
        <div
          className={`
            flex h-9 w-9 shrink-0 items-center justify-center rounded-md
            ${enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}
          `}
        >
          <Icon className="h-4 w-4" />
        </div>

        {/* Widget Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{widget.name}</div>
          <div className="text-xs text-muted-foreground truncate">
            {widget.description}
          </div>
        </div>

        {/* Quick Size Controls */}
        {enabled && (
          <div className="flex items-center gap-1">
            {!isMinSize && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleShrink}
                disabled={isPending}
                title={`Shrink to ${minWidth}×${minHeight}`}
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {!isMaxSize && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleExpand}
                disabled={isPending}
                title="Expand to 4×4"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}

        {/* Toggle Button */}
        <div className="flex items-center gap-2">
          {isPending && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <button
            type="button"
            onClick={() => onToggle(id, !enabled)}
            disabled={isPending}
            className={`
              relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
              ${enabled ? "bg-primary" : "bg-input"}
              ${isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
            role="switch"
            aria-checked={enabled}
            aria-label={`${enabled ? "Hide" : "Show"} ${widget.name} widget`}
          >
            <span
              className={`
                block h-5 w-5 rounded-full bg-background shadow-sm ring-0
                transition-transform duration-200
                ${enabled ? "translate-x-5" : "translate-x-0.5"}
              `}
            />
          </button>
        </div>
      </div>

      {/* Size Controls Row (only when enabled) */}
      {enabled && (
        <div className="flex items-center justify-between pl-10 pr-2 py-1 bg-muted/30 rounded">
          <div className="flex items-center gap-4">
            <SizeControl
              label="W"
              value={width}
              min={minWidth}
              onChange={handleWidthChange}
              disabled={isPending}
            />
            <SizeControl
              label="H"
              value={height}
              min={minHeight}
              onChange={handleHeightChange}
              disabled={isPending}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            min: {minWidth}×{minHeight}
          </span>
        </div>
      )}
    </div>
  );
}

interface DashboardConfigSheetProps {
  settings: WidgetSettings;
  isAdmin: boolean;
}

export function DashboardConfigSheet({
  settings,
}: DashboardConfigSheetProps) {
  const sheetId = useId();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [localSettings, setLocalSettings] = useState(settings);

  // Sort widgets by order for display and resolve sizes
  const sortedWidgets = [...localSettings.widgets]
    .sort((a, b) => a.order - b.order)
    .map((w) => ({
      ...w,
      ...resolveWidgetSize(w, WIDGET_REGISTRY[w.id]),
    }));
  const widgetIds = sortedWidgets.map((w) => w.id);

  const isAutoLayout = localSettings.layoutMode === "auto";

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleToggle(widgetId: WidgetId, enabled: boolean) {
    // Optimistic update
    setLocalSettings((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) =>
        w.id === widgetId ? { ...w, enabled } : w
      ),
    }));

    startTransition(() => {
      performVisibilityUpdate(widgetId, enabled);
    });
  }

  async function performVisibilityUpdate(widgetId: WidgetId, enabled: boolean) {
    const result = await updateWidgetVisibility(widgetId, enabled);
    if (result.error) {
      // Revert on error
      setLocalSettings((prev) => ({
        ...prev,
        widgets: prev.widgets.map((w) =>
          w.id === widgetId ? { ...w, enabled: !enabled } : w
        ),
      }));
    } else {
      // Refresh to sync DashboardGrid
      router.refresh();
    }
  }

  function handleSizeChange(widgetId: WidgetId, width: WidgetWidth, height: WidgetHeight) {
    // Optimistic update
    setLocalSettings((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) =>
        w.id === widgetId ? { ...w, width, height } : w
      ),
    }));

    startTransition(() => {
      performSizeUpdate(widgetId, width, height);
    });
  }

  async function performSizeUpdate(widgetId: WidgetId, width: WidgetWidth, height: WidgetHeight) {
    const result = await updateWidgetSize(widgetId, width, height);
    if (result.error) {
      // Revert on error - reload from settings prop
      setLocalSettings(settings);
    } else {
      router.refresh();
    }
  }

  function handleLayoutModeChange(auto: boolean) {
    const newMode: LayoutMode = auto ? "auto" : "manual";
    
    // Optimistic update
    setLocalSettings((prev) => ({
      ...prev,
      layoutMode: newMode,
    }));

    startTransition(() => {
      performLayoutModeUpdate(newMode);
    });
  }

  async function performLayoutModeUpdate(mode: LayoutMode) {
    const result = await updateLayoutMode(mode);
    if (result.error) {
      // Revert on error
      setLocalSettings(settings);
    } else {
      router.refresh();
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const currentWidgetIds = sortedWidgets.map((w) => w.id);
      const oldIndex = currentWidgetIds.indexOf(active.id as WidgetId);
      const newIndex = currentWidgetIds.indexOf(over.id as WidgetId);
      const newOrder = arrayMove(currentWidgetIds, oldIndex, newIndex);

      // Optimistic update
      setLocalSettings((prev) => ({
        ...prev,
        widgets: prev.widgets.map((w) => ({
          ...w,
          order: newOrder.indexOf(w.id),
        })),
      }));

      startTransition(() => {
        performOrderUpdate(newOrder);
      });
    }
  }

  async function performOrderUpdate(newOrder: WidgetId[]) {
    const result = await updateWidgetOrder(newOrder);
    if (result.error) {
      // Revert on error
      setLocalSettings(settings);
    } else {
      // Refresh to sync DashboardGrid
      router.refresh();
    }
  }

  function handleOpenChange(open: boolean) {
    if (open) {
      setLocalSettings(settings);
    }
    setIsOpen(open);
  }

  const enabledCount = localSettings.widgets.filter((w) => w.enabled).length;
  const totalCount = localSettings.widgets.length;

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild id={`${sheetId}-trigger`}>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Configure</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Dashboard Widgets
          </SheetTitle>
          <SheetDescription>
            Toggle widgets on or off, and drag to reorder them.
            <span className="block mt-1 text-xs">
              Showing {enabledCount} of {totalCount} widgets
            </span>
          </SheetDescription>
        </SheetHeader>

        {/* Layout Mode Toggle */}
        <div className="mt-6 p-4 rounded-lg border bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="layout-mode" className="text-sm font-medium">
                Layout Mode
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {isAutoLayout ? "Auto" : "Manual"}
              </span>
              <Switch
                id="layout-mode"
                checked={isAutoLayout}
                onCheckedChange={handleLayoutModeChange}
                disabled={isPending}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {isAutoLayout
              ? "Auto mode groups widgets by height into uniform rows."
              : "Manual mode packs widgets in order into rows."}
          </p>
        </div>

        <div className="mt-6 space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={widgetIds}
              strategy={verticalListSortingStrategy}
            >
              {sortedWidgets.map((widget) => (
                <SortableWidgetItem
                  key={widget.id}
                  id={widget.id}
                  enabled={widget.enabled}
                  width={widget.width}
                  height={widget.height}
                  minWidth={widget.minWidth}
                  minHeight={widget.minHeight}
                  onToggle={handleToggle}
                  onSizeChange={handleSizeChange}
                  isPending={isPending}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            💡 Tip: Changes are saved automatically
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
