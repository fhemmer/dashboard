"use client";

import { hexToOklch, isValidHex, oklchToHex } from "@/lib/color";
import type { ThemeVariableName } from "@/lib/theme-utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCallback, useId, useMemo, useState } from "react";

interface ColorPickerProps {
  variableName: ThemeVariableName;
  label: string;
  oklchValue: string;
  onChange: (variableName: ThemeVariableName, oklchValue: string) => void;
}

/**
 * A color picker that works with OKLCH values but provides HEX input
 */
export function ColorPicker({ variableName, label, oklchValue, onChange }: ColorPickerProps) {
  const id = useId();

  // Convert OKLCH to HEX for display - derived state, not an effect
  const derivedHex = useMemo(() => oklchToHex(oklchValue) ?? "#000000", [oklchValue]);

  // Local state for the input that updates immediately
  const [localHex, setLocalHex] = useState<string | null>(null);

  // Use local state if user is typing, otherwise use derived value
  const hexInput = localHex ?? derivedHex;

  const handleHexChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newHex = e.target.value;
      setLocalHex(newHex);

      if (isValidHex(newHex)) {
        const oklch = hexToOklch(newHex);
        if (oklch) {
          onChange(variableName, oklch);
          // Clear local state so derived value takes over
          setLocalHex(null);
        }
      }
    },
    [onChange, variableName]
  );

  const handleColorInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newHex = e.target.value;
      setLocalHex(null); // Clear local state immediately

      const oklch = hexToOklch(newHex);
      if (oklch) {
        onChange(variableName, oklch);
      }
    },
    [onChange, variableName]
  );

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      <div className="flex gap-2">
        {/* Native color picker */}
        <input
          type="color"
          value={hexInput.startsWith("#") ? hexInput : `#${hexInput.replace(/^#/, "")}`}
          onChange={handleColorInputChange}
          className="h-9 w-12 cursor-pointer rounded border border-input bg-transparent p-0.5"
          aria-label={`Color picker for ${label}`}
        />
        {/* HEX text input */}
        <Input
          id={id}
          type="text"
          value={hexInput}
          onChange={handleHexChange}
          placeholder="#000000"
          className="font-mono text-xs"
        />
      </div>
      {/* OKLCH display */}
      <p className="truncate font-mono text-[10px] text-muted-foreground" title={oklchValue}>
        {oklchValue}
      </p>
    </div>
  );
}
