"use client";

import { useTheme } from "@/hooks/use-theme";
import { type ThemeName, themeRegistry } from "@/themes";
import { useEffect, useRef } from "react";

interface ThemePickerProps {
  defaultValue?: string | null;
  name?: string;
}

export function ThemePicker({ defaultValue, name = "theme" }: ThemePickerProps) {
  const { theme, setTheme } = useTheme();
  const hasSynced = useRef(false);

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
      setTheme(defaultValue as ThemeName);
    }
  }, [defaultValue, theme, setTheme]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = e.target.value as ThemeName;
    setTheme(newTheme);
  };

  return (
    <div className="space-y-3">
      <select
        id="theme"
        name={name}
        value={theme}
        onChange={handleChange}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        {themeRegistry.map((t) => (
          <option key={t.name} value={t.name}>
            {t.label}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {themeRegistry.map((t) => (
          <button
            key={t.name}
            type="button"
            onClick={() => setTheme(t.name)}
            className={`relative flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-xs transition-colors hover:bg-accent ${
              theme === t.name
                ? "border-primary bg-accent"
                : "border-transparent bg-muted/50"
            }`}
          >
            <ThemePreview theme={t.name} />
            <span className="font-medium">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ThemePreview({ theme }: { theme: ThemeName }) {
  // Color swatches based on theme
  const colors: Record<ThemeName, { primary: string; accent: string; bg: string }> = {
    default: { primary: "#333", accent: "#666", bg: "#f5f5f5" },
    ocean: { primary: "#2563eb", accent: "#0ea5e9", bg: "#eff6ff" },
    forest: { primary: "#16a34a", accent: "#84cc16", bg: "#f0fdf4" },
    sunset: { primary: "#ea580c", accent: "#f472b6", bg: "#fff7ed" },
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
