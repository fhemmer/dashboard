/**
 * Brightness adjustment utilities using CSS filters
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
 * Parse hex color to RGB values
 * @param hex Hex color string (e.g., "#ff0000" or "#f00")
 * @returns RGB tuple [r, g, b] (0-255) or null if invalid
 */
export function parseHexToRgb(hex: string): [number, number, number] | null {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (match) {
    return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
  }
  // Handle shorthand hex (#f00)
  const shortMatch = hex.match(/^#?([a-f\d])([a-f\d])([a-f\d])$/i);
  if (shortMatch) {
    return [
      parseInt(shortMatch[1] + shortMatch[1], 16),
      parseInt(shortMatch[2] + shortMatch[2], 16),
      parseInt(shortMatch[3] + shortMatch[3], 16),
    ];
  }
  return null;
}

/**
 * Convert RGB to hex
 * @param r Red (0-255)
 * @param g Green (0-255)
 * @param b Blue (0-255)
 * @returns Hex color string
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Adjust brightness of a hex color
 * @param hex Hex color string
 * @param brightness Brightness percentage (0-200)
 * @returns Adjusted hex color string
 */
export function adjustHexColor(hex: string, brightness: number): string {
  const rgb = parseHexToRgb(hex);
  if (!rgb) return hex;

  const multiplier = brightness / 100;
  const adjusted = rgb.map((v) => v * multiplier) as [number, number, number];
  return rgbToHex(adjusted[0], adjusted[1], adjusted[2]);
}

/**
 * Parse rgb/rgba color string
 * @param color RGB color string (e.g., "rgb(255, 0, 0)" or "rgba(255, 0, 0, 0.5)")
 * @returns RGB tuple [r, g, b] and optional alpha, or null if invalid
 */
export function parseRgb(
  color: string
): { r: number; g: number; b: number; a?: number } | null {
  // Match rgb( or rgba( followed by 3-4 numbers, comma-separated format
  // Using \d{1,3} instead of \d+ to limit backtracking
  const rgbMatch = color.match(/^rgba?\((\d{1,3}),\s?(\d{1,3}),\s?(\d{1,3})(?:,\s?([01]?\.?\d*))?\)$/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
      a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : undefined,
    };
  }
  // Also support space-separated format: rgb(255 0 0) or rgb(255 0 0 / 0.5)
  const spaceMatch = color.match(/^rgba?\((\d{1,3}) (\d{1,3}) (\d{1,3})(?: \/ ([01]?\.?\d*))?\)$/);
  if (spaceMatch) {
    return {
      r: parseInt(spaceMatch[1], 10),
      g: parseInt(spaceMatch[2], 10),
      b: parseInt(spaceMatch[3], 10),
      a: spaceMatch[4] ? parseFloat(spaceMatch[4]) : undefined,
    };
  }
  return null;
}

/**
 * Adjust brightness of an RGB color string
 * @param color RGB color string
 * @param brightness Brightness percentage (0-200)
 * @returns Adjusted RGB color string
 */
export function adjustRgbColor(color: string, brightness: number): string {
  const rgb = parseRgb(color);
  if (!rgb) return color;

  const multiplier = brightness / 100;
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const r = clamp(rgb.r * multiplier);
  const g = clamp(rgb.g * multiplier);
  const b = clamp(rgb.b * multiplier);

  if (rgb.a !== undefined) {
    return `rgba(${r}, ${g}, ${b}, ${rgb.a})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Parse lab color string
 * @param color Lab color string (e.g., "lab(94.1916% -1.09133 -3.56996)")
 * @returns Parsed values or null if invalid
 */
export function parseLab(
  color: string
): { l: number; a: number; b: number; alpha?: number } | null {
  if (!color.startsWith("lab(") || !color.endsWith(")")) return null;

  // Extract content between lab( and )
  const content = color.slice(4, -1).trim();

  // Check for alpha (contains /)
  const slashIdx = content.indexOf("/");
  let mainPart = content;
  let alphaPart: string | null = null;
  if (slashIdx !== -1) {
    mainPart = content.slice(0, slashIdx).trim();
    alphaPart = content.slice(slashIdx + 1).trim();
  }

  // Split main part by spaces
  const parts = mainPart.split(/\s+/);
  if (parts.length !== 3) return null;

  // First part should end with %
  if (!parts[0].endsWith("%")) return null;
  const l = parseFloat(parts[0].slice(0, -1));
  const a = parseFloat(parts[1]);
  const b = parseFloat(parts[2]);

  if (isNaN(l) || isNaN(a) || isNaN(b)) return null;

  const result: { l: number; a: number; b: number; alpha?: number } = { l, a, b };
  if (alphaPart !== null) {
    const alpha = parseFloat(alphaPart);
    if (!isNaN(alpha)) result.alpha = alpha;
  }

  return result;
}

/**
 * Adjust brightness of a LAB color by scaling the L (lightness) component
 * @param color Lab color string
 * @param brightness Brightness percentage (0-200)
 * @returns Adjusted lab color string
 */
export function adjustLabColor(color: string, brightness: number): string {
  const lab = parseLab(color);
  if (!lab) return color;

  const multiplier = brightness / 100;
  // L is 0-100%, clamp to valid range
  const newL = Math.max(0, Math.min(100, lab.l * multiplier));
  // Format with up to 3 decimal places, trimming trailing zeros
  const lStr = parseFloat(newL.toFixed(3)).toString();

  if (lab.alpha !== undefined) {
    return `lab(${lStr}% ${lab.a} ${lab.b} / ${lab.alpha})`;
  }
  return `lab(${lStr}% ${lab.a} ${lab.b})`;
}

/**
 * Adjust any supported color format's brightness
 * @param color Color string (hex, rgb, rgba, oklch, lab)
 * @param brightness Brightness percentage (0-200)
 * @returns Adjusted color string
 */
export function adjustColorBrightness(color: string, brightness: number): string {
  if (brightness === 100) return color;

  // Try lab (browser computed style format)
  if (color.startsWith("lab(")) {
    return adjustLabColor(color, brightness);
  }

  // Try oklch
  if (color.includes("oklch")) {
    return adjustOklchColor(color, brightness);
  }

  // Try hex
  if (color.startsWith("#")) {
    return adjustHexColor(color, brightness);
  }

  // Try rgb/rgba
  if (color.startsWith("rgb")) {
    return adjustRgbColor(color, brightness);
  }

  // Unknown format, return unchanged
  return color;
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

// CSS variables that represent foreground/text colors
const FOREGROUND_VARS = [
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

// CSS variables that represent background/surface colors
const BACKGROUND_VARS = [
  "--background",
  "--primary",
  "--secondary",
  "--accent",
  "--muted",
  "--card",
  "--popover",
  "--border",
  "--input",
  "--ring",
  "--sidebar",
  "--sidebar-primary",
  "--sidebar-accent",
  "--sidebar-border",
  "--sidebar-ring",
];

// Store original values to allow proper recalculation
const originalValues = new Map<string, string>();

/**
 * Get the original (theme-defined) value of a CSS variable
 * This temporarily removes inline styles to read the underlying theme value
 */
function getOriginalValue(root: HTMLElement, varName: string): string {
  // Check if we already have it cached
  const cached = originalValues.get(varName);
  if (cached) return cached;

  // Temporarily remove any inline style to get the computed (theme) value
  const inlineValue = root.style.getPropertyValue(varName);
  if (inlineValue) {
    root.style.removeProperty(varName);
  }

  // Force a reflow so getComputedStyle reflects the removal
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  root.offsetHeight;

  // Get computed style - this now includes only theme values
  const computed = getComputedStyle(root).getPropertyValue(varName).trim();

  // Restore the inline style if it existed
  if (inlineValue) {
    root.style.setProperty(varName, inlineValue);
  }

  if (computed) {
    originalValues.set(varName, computed);
    return computed;
  }

  return "";
}

/**
 * Clear cached original values (call when theme changes)
 */
export function clearBrightnessCache(): void {
  originalValues.clear();
}

/**
 * Apply brightness adjustment to a list of CSS variables
 */
function applyBrightnessToVars(
  root: HTMLElement,
  vars: string[],
  brightness: number
): void {
  if (brightness === 100) {
    for (const varName of vars) {
      root.style.removeProperty(varName);
    }
    return;
  }

  for (const varName of vars) {
    const original = getOriginalValue(root, varName);
    if (original) {
      const adjusted = adjustColorBrightness(original, brightness);
      if (adjusted !== original) {
        root.style.setProperty(varName, adjusted);
      }
    }
  }
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
  const fgBrightness = isDark ? settings.fgDark : settings.fgLight;
  const bgBrightness = isDark ? settings.bgDark : settings.bgLight;

  // If both are at default, reset all adjustments
  if (fgBrightness === 100 && bgBrightness === 100) {
    resetBrightnessOnDocument();
    return;
  }

  applyBrightnessToVars(root, FOREGROUND_VARS, fgBrightness);
  applyBrightnessToVars(root, BACKGROUND_VARS, bgBrightness);
}

/**
 * Reset brightness adjustments by removing inline style overrides
 */
export function resetBrightnessOnDocument(): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  // Remove all inline style overrides for brightness-affected variables
  for (const varName of FOREGROUND_VARS) {
    root.style.removeProperty(varName);
  }
  for (const varName of BACKGROUND_VARS) {
    root.style.removeProperty(varName);
  }

  // Clear cached values so they're re-read from theme
  clearBrightnessCache();
}
