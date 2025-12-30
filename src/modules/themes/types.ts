/**
 * Types for the custom themes module
 */

import type { ThemeVariables } from "@/lib/theme-utils";

/**
 * Custom theme as stored in the database
 */
export interface UserTheme {
  id: string;
  user_id: string;
  name: string;
  light_variables: ThemeVariables;
  dark_variables: ThemeVariables;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Data for creating a new theme
 */
export interface CreateThemeInput {
  name: string;
  lightVariables: ThemeVariables;
  darkVariables: ThemeVariables;
}

/**
 * Data for updating an existing theme
 */
export interface UpdateThemeInput {
  id: string;
  name?: string;
  lightVariables?: ThemeVariables;
  darkVariables?: ThemeVariables;
}

/**
 * Theme editor state
 */
export interface ThemeEditorState {
  name: string;
  lightVariables: ThemeVariables;
  darkVariables: ThemeVariables;
  editingMode: "light" | "dark";
  isDirty: boolean;
}

/**
 * Custom theme identifier format
 */
export const CUSTOM_THEME_PREFIX = "custom:";

/**
 * Check if a theme name represents a custom theme
 */
export function isCustomTheme(themeName: string): boolean {
  return themeName.startsWith(CUSTOM_THEME_PREFIX);
}

/**
 * Extract the UUID from a custom theme name
 */
export function getCustomThemeId(themeName: string): string | null {
  if (!isCustomTheme(themeName)) return null;
  return themeName.slice(CUSTOM_THEME_PREFIX.length);
}

/**
 * Create a theme name from a custom theme UUID
 */
export function makeCustomThemeName(id: string): string {
  return `${CUSTOM_THEME_PREFIX}${id}`;
}
