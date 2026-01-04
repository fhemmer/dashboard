"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { WidgetHeight, WidgetWidth } from "@/lib/widgets";
import { Maximize2, Minimize2, MoveHorizontal, MoveVertical } from "lucide-react";

interface WidgetSizeControlProps {
  currentWidth: WidgetWidth;
  currentHeight: WidgetHeight;
  minWidth: WidgetWidth;
  minHeight: WidgetHeight;
  onSizeChange: (width: WidgetWidth, height: WidgetHeight) => void;
  disabled?: boolean;
}

/** Cycles height: 1 -> 2 -> 3 -> 4 -> 1 (respecting minHeight) */
function cycleHeight(current: WidgetHeight, min: WidgetHeight): WidgetHeight {
  const next = current >= 4 ? 1 : (current + 1) as WidgetHeight;
  return Math.max(next, min) as WidgetHeight;
}

/** Cycles width: 1 -> 2 -> 3 -> 4 -> 1 (respecting minWidth) */
function cycleWidth(current: WidgetWidth, min: WidgetWidth): WidgetWidth {
  const next = current >= 4 ? 1 : (current + 1) as WidgetWidth;
  return Math.max(next, min) as WidgetWidth;
}

export function WidgetSizeControl({
  currentWidth,
  currentHeight,
  minWidth,
  minHeight,
  onSizeChange,
  disabled = false,
}: WidgetSizeControlProps) {
  function handleHeightCycle() {
    onSizeChange(currentWidth, cycleHeight(currentHeight, minHeight));
  }

  function handleWidthCycle() {
    onSizeChange(cycleWidth(currentWidth, minWidth), currentHeight);
  }

  function handleExpand() {
    // Expand to 4×4 (or stay at min if min is larger)
    onSizeChange(
      Math.max(4, minWidth) as WidgetWidth,
      Math.max(4, minHeight) as WidgetHeight
    );
  }

  function handleShrink() {
    // Shrink to minimum size
    onSizeChange(minWidth, minHeight);
  }

  const isMaxSize = currentWidth >= 4 && currentHeight >= 4;
  const isMinSize = currentWidth === minWidth && currentHeight === minHeight;

  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      {/* Height control */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleHeightCycle}
            disabled={disabled}
          >
            <MoveVertical className="h-3.5 w-3.5" />
            <span className="sr-only">Cycle height ({currentHeight}x)</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Height: {currentHeight} (min: {minHeight}, click to cycle)</p>
        </TooltipContent>
      </Tooltip>

      {/* Width control */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleWidthCycle}
            disabled={disabled}
          >
            <MoveHorizontal className="h-3.5 w-3.5" />
            <span className="sr-only">Cycle width ({currentWidth}x)</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Width: {currentWidth} (min: {minWidth}, click to cycle)</p>
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
            <p>Expand to 4×4</p>
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
            <p>Shrink to {minWidth}×{minHeight}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
