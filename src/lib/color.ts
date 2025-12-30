/**
 * Color conversion utilities using culori
 * Converts between HEX and OKLCH color formats
 */

import { formatHex, oklch, parse } from "culori";

export interface OklchComponents {
  l: number;
  c: number;
  h: number;
  alpha?: number;
}

/**
 * Parse an OKLCH CSS string into components
 * @param oklchString - e.g., "oklch(0.6 0.2 250)" or "oklch(0.6 0.2 250 / 50%)"
 */
export function parseOklch(oklchString: string): OklchComponents | null {
  if (!oklchString || !oklchString.startsWith("oklch(")) {
    return null;
  }

  try {
    const parsed = parse(oklchString);
    if (!parsed || parsed.mode !== "oklch") {
      return null;
    }

    return {
      l: parsed.l ?? 0,
      c: parsed.c ?? 0,
      h: parsed.h ?? 0,
      alpha: parsed.alpha,
    };
  } catch {
    return null;
  }
}

/**
 * Convert OKLCH CSS string to HEX color
 * @param oklchString - e.g., "oklch(0.6 0.2 250)"
 * @returns HEX color string like "#3b82f6" or null if conversion fails
 */
export function oklchToHex(oklchString: string): string | null {
  if (!oklchString) {
    return null;
  }

  try {
    const parsed = parse(oklchString);
    if (!parsed) {
      return null;
    }

    const hex = formatHex(parsed);
    return hex ?? null;
  } catch {
    return null;
  }
}

/**
 * Convert HEX color to OKLCH CSS string
 * @param hex - HEX color like "#3b82f6" or "3b82f6"
 * @returns OKLCH CSS string like "oklch(0.6 0.2 250)"
 */
export function hexToOklch(hex: string): string | null {
  if (!hex) {
    return null;
  }

  // Normalize hex - add # if missing
  const normalizedHex = hex.startsWith("#") ? hex : `#${hex}`;

  try {
    const parsed = parse(normalizedHex);
    if (!parsed) {
      return null;
    }

    const oklchColor = oklch(parsed);
    if (!oklchColor) {
      return null;
    }

    // Round to 3 decimal places for cleaner output
    const l = Math.round(oklchColor.l * 1000) / 1000;
    const c = Math.round(oklchColor.c * 1000) / 1000;
    const h = Math.round((oklchColor.h ?? 0) * 1000) / 1000;

    return `oklch(${l} ${c} ${h})`;
  } catch {
    return null;
  }
}

/**
 * Format OKLCH components back to CSS string
 */
export function formatOklchString(components: OklchComponents): string {
  const { l, c, h, alpha } = components;
  const lRound = Math.round(l * 1000) / 1000;
  const cRound = Math.round(c * 1000) / 1000;
  const hRound = Math.round(h * 1000) / 1000;

  if (alpha !== undefined && alpha < 1) {
    const alphaPercent = Math.round(alpha * 100);
    return `oklch(${lRound} ${cRound} ${hRound} / ${alphaPercent}%)`;
  }

  return `oklch(${lRound} ${cRound} ${hRound})`;
}

/**
 * Check if a string is a valid HEX color
 */
export function isValidHex(hex: string): boolean {
  if (!hex) return false;
  const normalized = hex.startsWith("#") ? hex : `#${hex}`;
  return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(normalized);
}

/**
 * Check if a string is a valid OKLCH CSS value
 */
export function isValidOklch(value: string): boolean {
  if (!value || !value.startsWith("oklch(")) return false;
  return parseOklch(value) !== null;
}
