/**
 * Theme variable utilities for extracting and manipulating CSS theme variables
 */

import { oklchToHex } from "./color";

/**
 * All CSS variable names used in the theme system (28 total)
 */
export const THEME_VARIABLE_NAMES = [
  // Core UI (14)
  "background",
  "foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "accent",
  "accent-foreground",
  "muted",
  "muted-foreground",
  "destructive",
  "border",
  "input",
  "ring",
  // Components (4)
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  // Sidebar (8)
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
  // Charts (5)
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
] as const;

export type ThemeVariableName = (typeof THEME_VARIABLE_NAMES)[number];

/**
 * Group definitions for organizing variables in the editor
 */
export const THEME_VARIABLE_GROUPS = {
  core: [
    "background",
    "foreground",
    "primary",
    "primary-foreground",
    "secondary",
    "secondary-foreground",
    "accent",
    "accent-foreground",
    "muted",
    "muted-foreground",
    "destructive",
    "border",
    "input",
    "ring",
  ],
  components: ["card", "card-foreground", "popover", "popover-foreground"],
  sidebar: [
    "sidebar",
    "sidebar-foreground",
    "sidebar-primary",
    "sidebar-primary-foreground",
    "sidebar-accent",
    "sidebar-accent-foreground",
    "sidebar-border",
    "sidebar-ring",
  ],
  charts: ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"],
} as const;

export type ThemeVariableGroup = keyof typeof THEME_VARIABLE_GROUPS;

/**
 * Human-readable labels for theme variables
 */
export const THEME_VARIABLE_LABELS: Record<ThemeVariableName, string> = {
  background: "Background",
  foreground: "Foreground",
  primary: "Primary",
  "primary-foreground": "Primary Foreground",
  secondary: "Secondary",
  "secondary-foreground": "Secondary Foreground",
  accent: "Accent",
  "accent-foreground": "Accent Foreground",
  muted: "Muted",
  "muted-foreground": "Muted Foreground",
  destructive: "Destructive",
  border: "Border",
  input: "Input",
  ring: "Ring",
  card: "Card",
  "card-foreground": "Card Foreground",
  popover: "Popover",
  "popover-foreground": "Popover Foreground",
  sidebar: "Sidebar",
  "sidebar-foreground": "Sidebar Foreground",
  "sidebar-primary": "Sidebar Primary",
  "sidebar-primary-foreground": "Sidebar Primary Foreground",
  "sidebar-accent": "Sidebar Accent",
  "sidebar-accent-foreground": "Sidebar Accent Foreground",
  "sidebar-border": "Sidebar Border",
  "sidebar-ring": "Sidebar Ring",
  "chart-1": "Chart 1",
  "chart-2": "Chart 2",
  "chart-3": "Chart 3",
  "chart-4": "Chart 4",
  "chart-5": "Chart 5",
};

/**
 * Theme variables as a record of OKLCH values
 */
export type ThemeVariables = Record<ThemeVariableName, string>;

/**
 * Theme variables with both OKLCH and HEX representations
 */
export interface ThemeVariableValue {
  oklch: string;
  hex: string;
}

export type ThemeVariablesWithHex = Record<ThemeVariableName, ThemeVariableValue>;

/**
 * Extract all theme CSS variables from the current document
 * @returns Object with OKLCH values for each variable
 */
export function extractCurrentThemeVariables(): ThemeVariables {
  if (typeof document === "undefined") {
    return createEmptyThemeVariables();
  }

  const styles = getComputedStyle(document.documentElement);
  const variables: Partial<ThemeVariables> = {};

  for (const name of THEME_VARIABLE_NAMES) {
    const value = styles.getPropertyValue(`--${name}`).trim();
    variables[name] = value || "oklch(0 0 0)";
  }

  return variables as ThemeVariables;
}

/**
 * Extract theme variables with HEX conversions
 */
export function extractThemeVariablesWithHex(): ThemeVariablesWithHex {
  const variables = extractCurrentThemeVariables();
  const result: Partial<ThemeVariablesWithHex> = {};

  for (const name of THEME_VARIABLE_NAMES) {
    const oklch = variables[name];
    result[name] = {
      oklch,
      hex: oklchToHex(oklch) ?? "#000000",
    };
  }

  return result as ThemeVariablesWithHex;
}

/**
 * Create empty theme variables with default values
 */
export function createEmptyThemeVariables(): ThemeVariables {
  const variables: Partial<ThemeVariables> = {};
  for (const name of THEME_VARIABLE_NAMES) {
    variables[name] = "oklch(0.5 0 0)";
  }
  return variables as ThemeVariables;
}

/**
 * Apply theme variables to the document
 * @param variables - Theme variables to apply
 */
export function applyThemeVariables(variables: ThemeVariables): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  for (const [name, value] of Object.entries(variables)) {
    root.style.setProperty(`--${name}`, value);
  }
}

/**
 * Clear custom theme variables from the document
 * Removes inline styles so CSS file values take effect
 */
export function clearCustomThemeVariables(): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  for (const name of THEME_VARIABLE_NAMES) {
    root.style.removeProperty(`--${name}`);
  }
}

/**
 * Convert a JSON object from the database to ThemeVariables
 */
export function parseThemeVariablesFromJson(json: Record<string, unknown>): ThemeVariables {
  const variables: Partial<ThemeVariables> = {};

  for (const name of THEME_VARIABLE_NAMES) {
    const value = json[name];
    if (typeof value === "string") {
      variables[name] = value;
    } else {
      variables[name] = "oklch(0.5 0 0)";
    }
  }

  return variables as ThemeVariables;
}
