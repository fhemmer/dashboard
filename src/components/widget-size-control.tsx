"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { WidgetColspan, WidgetRowspan } from "@/lib/widgets";
import { Maximize2, Minimize2, MoveHorizontal, MoveVertical } from "lucide-react";

interface WidgetSizeControlProps {
  currentColspan: WidgetColspan;
  currentRowspan: WidgetRowspan;
  onSizeChange: (colspan: WidgetColspan, rowspan: WidgetRowspan) => void;
  disabled?: boolean;
}

/** Cycles rowspan: 1 -> 2 -> 3 -> 1 */
function cycleRowspan(current: WidgetRowspan): WidgetRowspan {
  const cycle: Record<WidgetRowspan, WidgetRowspan> = { 1: 2, 2: 3, 3: 1 };
  return cycle[current];
}

/** Toggles colspan: 1 <-> 2 */
function toggleColspan(current: WidgetColspan): WidgetColspan {
  return current === 1 ? 2 : 1;
}

export function WidgetSizeControl({
  currentColspan,
  currentRowspan,
  onSizeChange,
  disabled = false,
}: WidgetSizeControlProps) {
  function handleRowspanCycle() {
    onSizeChange(currentColspan, cycleRowspan(currentRowspan));
  }

  function handleColspanToggle() {
    onSizeChange(toggleColspan(currentColspan), currentRowspan);
  }

  function handleExpand() {
    // Expand to maximum size
    onSizeChange(2, 3);
  }

  function handleShrink() {
    // Shrink to minimum size
    onSizeChange(1, 1);
  }

  const isMaxSize = currentColspan === 2 && currentRowspan === 3;
  const isMinSize = currentColspan === 1 && currentRowspan === 1;

  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      {/* Height control */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleRowspanCycle}
            disabled={disabled}
          >
            <MoveVertical className="h-3.5 w-3.5" />
            <span className="sr-only">Cycle height ({currentRowspan}x)</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Height: {currentRowspan}x (click to cycle)</p>
        </TooltipContent>
      </Tooltip>

      {/* Width control */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleColspanToggle}
            disabled={disabled}
          >
            <MoveHorizontal className="h-3.5 w-3.5" />
            <span className="sr-only">Toggle width ({currentColspan}x)</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Width: {currentColspan}x (click to toggle)</p>
        </TooltipContent>
      </Tooltip>

      {/* Quick expand/shrink */}
      {!isMaxSize && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleExpand}
              disabled={disabled}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="sr-only">Expand to max</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Expand to 2×3</p>
          </TooltipContent>
        </Tooltip>
      )}

      {!isMinSize && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleShrink}
              disabled={disabled}
            >
              <Minimize2 className="h-3.5 w-3.5" />
              <span className="sr-only">Shrink to min</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Shrink to 1×1</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
