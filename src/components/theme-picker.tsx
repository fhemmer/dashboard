"use client";

import { getUserThemes } from "@/app/themes/actions";
import { useCustomTheme } from "@/components/custom-theme-provider";
import { useTheme } from "@/hooks/use-theme";
import { oklchToHex } from "@/lib/color";
import { isCustomTheme, makeCustomThemeName, type UserTheme } from "@/modules/themes/types";
import { type ThemeName, themeRegistry } from "@/themes";
import { Palette } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface ThemePickerProps {
  defaultValue?: string | null;
  name?: string;
}

export function ThemePicker({ defaultValue, name = "theme" }: ThemePickerProps) {
  const { theme, setTheme } = useTheme();
  const { applyCustomTheme, clearCustomTheme, activeCustomThemeId } = useCustomTheme();
  const [customThemes, setCustomThemes] = useState<UserTheme[]>([]);
  const hasSynced = useRef(false);

  // Load custom themes
  useEffect(() => {
    getUserThemes().then(setCustomThemes);
  }, []);

  // Sync server theme to localStorage only once on initial mount
  useEffect(() => {
    // Only sync once and only when conditions are met
    if (
      !hasSynced.current &&
      defaultValue &&
      defaultValue !== theme &&
      defaultValue !== "default"
    ) {
      hasSynced.current = true;
      // Check if it's a custom theme
      if (isCustomTheme(defaultValue)) {
        // Custom theme will be handled by CustomThemeProvider
      } else {
        setTheme(defaultValue as ThemeName);
      }
    }
  }, [defaultValue, theme, setTheme]);

  const handlePresetChange = (newTheme: ThemeName) => {
    clearCustomTheme();
    setTheme(newTheme);
  };

  const handleCustomThemeSelect = (customTheme: UserTheme) => {
    applyCustomTheme(customTheme.id, customTheme.light_variables, customTheme.dark_variables);
    // Store in localStorage for persistence
    localStorage.setItem("theme-name", makeCustomThemeName(customTheme.id));
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (isCustomTheme(value)) {
      const customTheme = customThemes.find((t) => makeCustomThemeName(t.id) === value);
      if (customTheme) {
        handleCustomThemeSelect(customTheme);
      }
    } else {
      handlePresetChange(value as ThemeName);
    }
  };

  // Determine current selection for the dropdown
  const currentValue = activeCustomThemeId
    ? makeCustomThemeName(activeCustomThemeId)
    : theme;

  return (
    <div className="space-y-3">
      <select
        id="theme"
        name={name}
        value={currentValue}
        onChange={handleChange}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <optgroup label="Preset Themes">
          {themeRegistry.map((t) => (
            <option key={t.name} value={t.name}>
              {t.label}
            </option>
          ))}
        </optgroup>
        {customThemes.length > 0 && (
          <optgroup label="Custom Themes">
            {customThemes.map((t) => (
              <option key={t.id} value={makeCustomThemeName(t.id)}>
                {t.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {/* Preset theme grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {themeRegistry.map((t) => (
          <button
            key={t.name}
            type="button"
            onClick={() => handlePresetChange(t.name)}
            className={`relative flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-xs transition-colors hover:bg-accent ${
              !activeCustomThemeId && theme === t.name
                ? "border-primary bg-accent"
                : "border-transparent bg-muted/50"
            }`}
          >
            <PresetThemePreview theme={t.name} />
            <span className="font-medium">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Custom themes section */}
      {customThemes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Custom Themes</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {customThemes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleCustomThemeSelect(t)}
                className={`relative flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-xs transition-colors hover:bg-accent ${
                  activeCustomThemeId === t.id
                    ? "border-primary bg-accent"
                    : "border-transparent bg-muted/50"
                }`}
              >
                <CustomThemePreview theme={t} />
                <span className="font-medium truncate max-w-full">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Link to theme builder */}
      <Link
        href="/themes"
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Palette className="h-3.5 w-3.5" />
        Customize themes
      </Link>
    </div>
  );
}

function PresetThemePreview({ theme }: { theme: ThemeName }) {
  // Color swatches based on theme
  const colors: Record<ThemeName, { primary: string; accent: string; bg: string }> = {
    default: { primary: "#333", accent: "#666", bg: "#f5f5f5" },
    ocean: { primary: "#2563eb", accent: "#0ea5e9", bg: "#eff6ff" },
    forest: { primary: "#16a34a", accent: "#84cc16", bg: "#f0fdf4" },
    sunset: { primary: "#ea580c", accent: "#f472b6", bg: "#fff7ed" },
    gold: { primary: "#ca8a04", accent: "#d97706", bg: "#fefce8" },
  };

  const c = colors[theme];

  return (
    <div
      className="flex h-8 w-full items-center justify-center gap-1 rounded"
      style={{ backgroundColor: c.bg }}
    >
      <div className="h-4 w-4 rounded-full" style={{ backgroundColor: c.primary }} />
      <div className="h-4 w-4 rounded-full" style={{ backgroundColor: c.accent }} />
    </div>
  );
}

function CustomThemePreview({ theme }: { theme: UserTheme }) {
  const primaryHex = oklchToHex(theme.light_variables.primary) ?? "#333";
  const accentHex = oklchToHex(theme.light_variables.accent) ?? "#666";
  const bgHex = oklchToHex(theme.light_variables.background) ?? "#f5f5f5";

  return (
    <div
      className="flex h-8 w-full items-center justify-center gap-1 rounded"
      style={{ backgroundColor: bgHex }}
    >
      <div className="h-4 w-4 rounded-full" style={{ backgroundColor: primaryHex }} />
      <div className="h-4 w-4 rounded-full" style={{ backgroundColor: accentHex }} />
    </div>
  );
}
