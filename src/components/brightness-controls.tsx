"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
    type BrightnessSettings,
    DEFAULT_BRIGHTNESS,
    applyBrightnessToDocument,
    getStoredBrightness,
    resetBrightnessOnDocument,
    setStoredBrightness,
} from "@/lib/brightness";
import { useEffect, useRef, useState } from "react";

interface BrightnessControlsProps {
  defaultValues?: Partial<BrightnessSettings>;
}

export function BrightnessControls({ defaultValues }: BrightnessControlsProps) {
  const [settings, setSettings] = useState<BrightnessSettings>(() => {
    if (defaultValues &&
        (defaultValues.fgLight !== undefined ||
         defaultValues.bgLight !== undefined ||
         defaultValues.fgDark !== undefined ||
         defaultValues.bgDark !== undefined)) {
      // Prefer server values on initial mount
      return {
        fgLight: defaultValues.fgLight ?? DEFAULT_BRIGHTNESS.fgLight,
        bgLight: defaultValues.bgLight ?? DEFAULT_BRIGHTNESS.bgLight,
        fgDark: defaultValues.fgDark ?? DEFAULT_BRIGHTNESS.fgDark,
        bgDark: defaultValues.bgDark ?? DEFAULT_BRIGHTNESS.bgDark,
      };
    }
    // Fallback to localStorage
    return getStoredBrightness();
  });

  const hasSynced = useRef(false);

  // Sync server values to localStorage once on mount (no state updates)
  useEffect(() => {
    if (
      !hasSynced.current &&
      defaultValues &&
      (defaultValues.fgLight !== undefined ||
        defaultValues.bgLight !== undefined ||
        defaultValues.fgDark !== undefined ||
        defaultValues.bgDark !== undefined)
    ) {
      hasSynced.current = true;
      const newSettings = {
        fgLight: defaultValues.fgLight ?? DEFAULT_BRIGHTNESS.fgLight,
        bgLight: defaultValues.bgLight ?? DEFAULT_BRIGHTNESS.bgLight,
        fgDark: defaultValues.fgDark ?? DEFAULT_BRIGHTNESS.fgDark,
        bgDark: defaultValues.bgDark ?? DEFAULT_BRIGHTNESS.bgDark,
      };
      setStoredBrightness(newSettings);
    }
  }, [defaultValues]);

  // Apply brightness when settings change
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    applyBrightnessToDocument(settings, isDark);
    setStoredBrightness(settings);
  }, [settings]);

  const handleChange = (key: keyof BrightnessSettings) => (values: number[]) => {
    setSettings((prev) => ({ ...prev, [key]: values[0] }));
  };

  const handleReset = () => {
    const defaults = DEFAULT_BRIGHTNESS;
    setSettings(defaults);
    setStoredBrightness(defaults);
    resetBrightnessOnDocument();
  };

  const isDefault =
    settings.fgLight === DEFAULT_BRIGHTNESS.fgLight &&
    settings.bgLight === DEFAULT_BRIGHTNESS.bgLight &&
    settings.fgDark === DEFAULT_BRIGHTNESS.fgDark &&
    settings.bgDark === DEFAULT_BRIGHTNESS.bgDark;

  return (
    <div className="space-y-6">
      {/* Hidden inputs for form submission */}
      <input type="hidden" name="fgBrightnessLight" value={settings.fgLight} />
      <input type="hidden" name="bgBrightnessLight" value={settings.bgLight} />
      <input type="hidden" name="fgBrightnessDark" value={settings.fgDark} />
      <input type="hidden" name="bgBrightnessDark" value={settings.bgDark} />

      {/* Light Mode Controls */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Light Mode</h4>
          <span className="text-xs text-muted-foreground">
            Adjust brightness for light theme
          </span>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="fg-light" className="text-sm">
                Foreground Brightness
              </Label>
              <span className="text-xs text-muted-foreground">{settings.fgLight}%</span>
            </div>
            <Slider
              id="fg-light"
              min={0}
              max={200}
              step={5}
              value={[settings.fgLight]}
              onValueChange={handleChange("fgLight")}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="bg-light" className="text-sm">
                Background Brightness
              </Label>
              <span className="text-xs text-muted-foreground">{settings.bgLight}%</span>
            </div>
            <Slider
              id="bg-light"
              min={0}
              max={200}
              step={5}
              value={[settings.bgLight]}
              onValueChange={handleChange("bgLight")}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Dark Mode Controls */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Dark Mode</h4>
          <span className="text-xs text-muted-foreground">
            Adjust brightness for dark theme
          </span>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="fg-dark" className="text-sm">
                Foreground Brightness
              </Label>
              <span className="text-xs text-muted-foreground">{settings.fgDark}%</span>
            </div>
            <Slider
              id="fg-dark"
              min={0}
              max={200}
              step={5}
              value={[settings.fgDark]}
              onValueChange={handleChange("fgDark")}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="bg-dark" className="text-sm">
                Background Brightness
              </Label>
              <span className="text-xs text-muted-foreground">{settings.bgDark}%</span>
            </div>
            <Slider
              id="bg-dark"
              min={0}
              max={200}
              step={5}
              value={[settings.bgDark]}
              onValueChange={handleChange("bgDark")}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {!isDefault && (
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Reset to defaults
        </button>
      )}
    </div>
  );
}
