/**
 * Font definitions and utilities
 *
 * Each font is preloaded in the layout and applied via CSS variable.
 * Fonts are applied using the data-font attribute on the document root.
 */

export const FONTS = [
  "geist",
  "inter",
  "roboto",
  "nunito",
  "open-sans",
  "lato",
  "playfair",
  "jetbrains",
  "fira-code",
  "source-serif",
  "merriweather",
] as const;

export type FontName = (typeof FONTS)[number];

export interface FontInfo {
  name: FontName;
  label: string;
  description: string;
  variable: string;
}

export const fontRegistry: FontInfo[] = [
  {
    name: "geist",
    label: "Geist",
    description: "Clean, modern geometric sans-serif",
    variable: "--font-geist-sans",
  },
  {
    name: "inter",
    label: "Inter",
    description: "Highly readable, neutral humanist",
    variable: "--font-inter",
  },
  {
    name: "roboto",
    label: "Roboto",
    description: "Google's familiar grotesque typeface",
    variable: "--font-roboto",
  },
  {
    name: "nunito",
    label: "Nunito",
    description: "Friendly with rounded terminals",
    variable: "--font-nunito",
  },
  {
    name: "open-sans",
    label: "Open Sans",
    description: "Professional, high legibility",
    variable: "--font-open-sans",
  },
  {
    name: "lato",
    label: "Lato",
    description: "Warm, semi-rounded aesthetic",
    variable: "--font-lato",
  },
  {
    name: "playfair",
    label: "Playfair Display",
    description: "Elegant serif with high contrast",
    variable: "--font-playfair",
  },
  {
    name: "jetbrains",
    label: "JetBrains Mono",
    description: "Developer-focused monospace font",
    variable: "--font-jetbrains",
  },
  {
    name: "fira-code",
    label: "Fira Code",
    description: "Monospace with programming ligatures",
    variable: "--font-fira-code",
  },
  {
    name: "source-serif",
    label: "Source Serif",
    description: "Adobe's elegant serif typeface",
    variable: "--font-source-serif",
  },
  {
    name: "merriweather",
    label: "Merriweather",
    description: "Traditional serif, excellent readability",
    variable: "--font-merriweather",
  },
];

export const DEFAULT_FONT: FontName = "geist";

export function isValidFont(font: string): font is FontName {
  return FONTS.includes(font as FontName);
}

export function getFontInfo(font: FontName): FontInfo | undefined {
  return fontRegistry.find((f) => f.name === font);
}

/**
 * Apply a font to the document root
 */
export function applyFontToDocument(font: FontName): void {
  if (typeof document === "undefined") return;
  const fontInfo = getFontInfo(font);
  if (!fontInfo) return;
  document.documentElement.setAttribute("data-font", font);
  document.documentElement.style.setProperty("--font-sans", `var(${fontInfo.variable})`);
}

/**
 * Get the current font from the document
 */
export function getCurrentFont(): FontName {
  if (typeof document === "undefined") return DEFAULT_FONT;
  const font = document.documentElement.getAttribute("data-font");
  return isValidFont(font ?? "") ? (font as FontName) : DEFAULT_FONT;
}

/**
 * Get font from localStorage
 */
export function getStoredFontName(): FontName {
  if (typeof localStorage === "undefined") return DEFAULT_FONT;
  const stored = localStorage.getItem("dashboard-font");
  return isValidFont(stored ?? "") ? (stored as FontName) : DEFAULT_FONT;
}

/**
 * Store font to localStorage
 */
export function setStoredFontName(font: FontName): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem("dashboard-font", font);
}
