/**
 * Brightness adjustment utilities for OKLCH color values
 *
 * Brightness values range from 0-200 where:
 * - 100 = default (no adjustment)
 * - 0-99 = darker
 * - 101-200 = brighter
 */

export interface BrightnessSettings {
  fgLight: number; // foreground brightness for light mode
  bgLight: number; // background brightness for light mode
  fgDark: number; // foreground brightness for dark mode
  bgDark: number; // background brightness for dark mode
}

export const DEFAULT_BRIGHTNESS: BrightnessSettings = {
  fgLight: 100,
  bgLight: 100,
  fgDark: 100,
  bgDark: 100,
};

/**
 * Adjust OKLCH lightness value based on brightness percentage
 * @param lightness Original lightness (0-1)
 * @param brightness Brightness percentage (0-200, default 100)
 * @returns Adjusted lightness (clamped to 0-1)
 */
export function adjustLightness(lightness: number, brightness: number): number {
  if (brightness === 100) return lightness;

  // Convert brightness percentage to multiplier
  // 0 -> 0x, 50 -> 0.5x, 100 -> 1x, 150 -> 1.5x, 200 -> 2x
  const multiplier = brightness / 100;

  // Apply adjustment
  const adjusted = lightness * multiplier;

  // Clamp to valid range
  return Math.max(0, Math.min(1, adjusted));
}

/**
 * Parse OKLCH color string and extract lightness value
 * @param oklch OKLCH color string (e.g., "oklch(0.5 0.2 180)")
 * @returns Lightness value (0-1) or null if invalid
 */
export function parseOklchLightness(oklch: string): number | null {
  const match = oklch.match(/oklch\(\s*([\d.]+)/);
  if (!match) return null;
  return parseFloat(match[1]);
}

/**
 * Replace lightness value in OKLCH color string
 * @param oklch Original OKLCH color string
 * @param newLightness New lightness value (0-1)
 * @returns Updated OKLCH color string
 */
export function replaceOklchLightness(oklch: string, newLightness: number): string {
  return oklch.replace(/oklch\(\s*([\d.]+)/, `oklch(${newLightness.toFixed(3)}`);
}

/**
 * Adjust an OKLCH color string's lightness
 * @param oklch Original OKLCH color string
 * @param brightness Brightness percentage (0-200)
 * @returns Adjusted OKLCH color string
 */
export function adjustOklchColor(oklch: string, brightness: number): string {
  const lightness = parseOklchLightness(oklch);
  if (lightness === null) return oklch;

  const adjusted = adjustLightness(lightness, brightness);
  return replaceOklchLightness(oklch, adjusted);
}

/**
 * Get brightness settings from localStorage
 */
export function getStoredBrightness(): BrightnessSettings {
  if (typeof localStorage === "undefined") return DEFAULT_BRIGHTNESS;

  try {
    const stored = localStorage.getItem("brightness-settings");
    if (!stored) return DEFAULT_BRIGHTNESS;

    const parsed = JSON.parse(stored);
    return {
      fgLight: parsed.fgLight ?? DEFAULT_BRIGHTNESS.fgLight,
      bgLight: parsed.bgLight ?? DEFAULT_BRIGHTNESS.bgLight,
      fgDark: parsed.fgDark ?? DEFAULT_BRIGHTNESS.fgDark,
      bgDark: parsed.bgDark ?? DEFAULT_BRIGHTNESS.bgDark,
    };
  } catch {
    return DEFAULT_BRIGHTNESS;
  }
}

/**
 * Store brightness settings to localStorage
 */
export function setStoredBrightness(settings: BrightnessSettings): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem("brightness-settings", JSON.stringify(settings));
}

/**
 * Apply brightness adjustments to document CSS variables
 * @param settings Brightness settings
 * @param isDark Whether dark mode is active
 */
export function applyBrightnessToDocument(
  settings: BrightnessSettings,
  isDark: boolean
): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const fg = isDark ? settings.fgDark : settings.fgLight;
  const bg = isDark ? settings.bgDark : settings.bgLight;

  // Get all CSS variables
  const computedStyle = getComputedStyle(root);

  // Foreground-related variables (text colors)
  const fgVars = [
    "--foreground",
    "--primary-foreground",
    "--secondary-foreground",
    "--accent-foreground",
    "--muted-foreground",
    "--card-foreground",
    "--popover-foreground",
    "--sidebar-foreground",
    "--sidebar-primary-foreground",
    "--sidebar-accent-foreground",
  ];

  // Background-related variables
  const bgVars = [
    "--background",
    "--primary",
    "--secondary",
    "--accent",
    "--muted",
    "--card",
    "--popover",
    "--sidebar",
    "--sidebar-primary",
    "--sidebar-accent",
  ];

  // Apply foreground adjustments
  for (const varName of fgVars) {
    const value = computedStyle.getPropertyValue(varName).trim();
    if (value && value.startsWith("oklch")) {
      const adjusted = adjustOklchColor(value, fg);
      root.style.setProperty(varName, adjusted);
    }
  }

  // Apply background adjustments
  for (const varName of bgVars) {
    const value = computedStyle.getPropertyValue(varName).trim();
    if (value && value.startsWith("oklch")) {
      const adjusted = adjustOklchColor(value, bg);
      root.style.setProperty(varName, adjusted);
    }
  }
}

/**
 * Reset brightness adjustments by removing inline styles
 */
export function resetBrightnessOnDocument(): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const allVars = [
    "--foreground",
    "--background",
    "--primary",
    "--primary-foreground",
    "--secondary",
    "--secondary-foreground",
    "--accent",
    "--accent-foreground",
    "--muted",
    "--muted-foreground",
    "--card",
    "--card-foreground",
    "--popover",
    "--popover-foreground",
    "--sidebar",
    "--sidebar-foreground",
    "--sidebar-primary",
    "--sidebar-primary-foreground",
    "--sidebar-accent",
    "--sidebar-accent-foreground",
  ];

  for (const varName of allVars) {
    root.style.removeProperty(varName);
  }
}
