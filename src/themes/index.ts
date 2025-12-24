/**
 * Theme definitions and utilities
 *
 * Each theme provides both light and dark mode variants via CSS.
 * Themes are applied using the data-theme attribute on the document root.
 */

export const THEMES = ["default", "ocean", "forest", "sunset", "gold"] as const;

export type ThemeName = (typeof THEMES)[number];

export interface ThemeInfo {
  name: ThemeName;
  label: string;
  description: string;
}

export const themeRegistry: ThemeInfo[] = [
  {
    name: "default",
    label: "Default",
    description: "Clean, professional, grayscale-based",
  },
  {
    name: "ocean",
    label: "Ocean",
    description: "Deep blue tones, calming and professional",
  },
  {
    name: "forest",
    label: "Forest",
    description: "Earthy greens and warm browns, organic and grounded",
  },
  {
    name: "sunset",
    label: "Sunset",
    description: "Warm oranges and soft pinks, vibrant and energetic",
  },
  {
    name: "gold",
    label: "Gold",
    description: "Luxurious gold and warm amber, elegant and refined",
  },
];

export function isValidTheme(theme: string): theme is ThemeName {
  return THEMES.includes(theme as ThemeName);
}

export function getThemeInfo(theme: ThemeName): ThemeInfo | undefined {
  return themeRegistry.find((t) => t.name === theme);
}

/**
 * Apply a theme to the document root
 */
export function applyThemeToDocument(theme: ThemeName): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

/**
 * Get the current theme from the document
 */
export function getCurrentTheme(): ThemeName {
  if (typeof document === "undefined") return "default";
  const theme = document.documentElement.getAttribute("data-theme");
  return isValidTheme(theme ?? "") ? (theme as ThemeName) : "default";
}

/**
 * Get theme from localStorage
 */
export function getStoredThemeName(): ThemeName {
  if (typeof localStorage === "undefined") return "default";
  const stored = localStorage.getItem("theme-name");
  return isValidTheme(stored ?? "") ? (stored as ThemeName) : "default";
}

/**
 * Store theme to localStorage
 */
export function setStoredThemeName(theme: ThemeName): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem("theme-name", theme);
}
