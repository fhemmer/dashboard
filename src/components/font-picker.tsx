"use client";

import { type FontName, fontRegistry } from "@/fonts";
import { useFont } from "@/hooks/use-font";
import { useEffect, useRef } from "react";

interface FontPickerProps {
  defaultValue?: string | null;
  name?: string;
}

export function FontPicker({ defaultValue, name = "font" }: FontPickerProps) {
  const { font, setFont } = useFont();
  const hasSynced = useRef(false);

  // Sync server font to localStorage only once on initial mount
  useEffect(() => {
    // Only sync once and only when conditions are met
    if (
      !hasSynced.current &&
      defaultValue &&
      defaultValue !== font &&
      defaultValue !== "geist"
    ) {
      hasSynced.current = true;
      setFont(defaultValue as FontName);
    }
  }, [defaultValue, font, setFont]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFont = e.target.value as FontName;
    setFont(newFont);
  };

  return (
    <div className="space-y-3">
      <select
        id="font"
        name={name}
        value={font}
        onChange={handleChange}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        {fontRegistry.map((f) => (
          <option key={f.name} value={f.name}>
            {f.label}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {fontRegistry.map((f) => (
          <button
            key={f.name}
            type="button"
            onClick={() => setFont(f.name)}
            className={`relative flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left transition-colors hover:bg-accent ${
              font === f.name
                ? "border-primary bg-accent"
                : "border-transparent bg-muted/50"
            }`}
          >
            <FontPreview font={f.name} />
            <span className="text-xs font-medium">{f.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FontPreview({ font }: { font: FontName }) {
  // Map font names to CSS font-family values for preview
  const fontFamilies: Record<FontName, string> = {
    geist: "var(--font-geist-sans)",
    inter: "var(--font-inter)",
    roboto: "var(--font-roboto)",
    nunito: "var(--font-nunito)",
    "open-sans": "var(--font-open-sans)",
    lato: "var(--font-lato)",
    playfair: "var(--font-playfair)",
    jetbrains: "var(--font-jetbrains)",
    "fira-code": "var(--font-fira-code)",
    "source-serif": "var(--font-source-serif)",
    merriweather: "var(--font-merriweather)",
    agave: "var(--font-agave)",
  };

  return (
    <div
      className="text-base leading-tight"
      style={{ fontFamily: fontFamilies[font] }}
    >
      The quick brown fox
    </div>
  );
}
