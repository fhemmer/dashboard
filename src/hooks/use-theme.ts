"use client";

import {
    type ThemeName,
    applyThemeToDocument,
    getStoredThemeName,
    isValidTheme,
    setStoredThemeName,
} from "@/themes";
import { useCallback, useEffect, useSyncExternalStore } from "react";

let listeners: Array<() => void> = [];

function emitThemeChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(callback: () => void): () => void {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

function getSnapshot(): ThemeName {
  return getStoredThemeName();
}

// Exported for testing - used by useSyncExternalStore during SSR
export function getServerSnapshot(): ThemeName {
  return "default";
}

/**
 * Hook to manage the current theme palette (not light/dark mode).
 * Syncs with localStorage and applies to document.
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemeName) => {
    if (!isValidTheme(newTheme)) return;
    setStoredThemeName(newTheme);
    applyThemeToDocument(newTheme);
    emitThemeChange();
  }, []);

  return { theme, setTheme };
}

/**
 * Initialize theme from localStorage on page load.
 * Call this in a client component that mounts early (e.g., layout).
 */
export function useThemeInit(serverTheme?: string | null) {
  useEffect(() => {
    // Priority: localStorage > serverTheme (from DB) > default
    const stored = getStoredThemeName();
    if (stored !== "default") {
      applyThemeToDocument(stored);
      return;
    }

    if (serverTheme && isValidTheme(serverTheme)) {
      setStoredThemeName(serverTheme);
      applyThemeToDocument(serverTheme);
      return;
    }

    applyThemeToDocument("default");
  }, [serverTheme]);
}
