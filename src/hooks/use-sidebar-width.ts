"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "dashboard-sidebar-width";
const DEFAULT_WIDTH = 256;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

let listeners: Array<() => void> = [];

function emitChange() {
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

export function clampWidth(width: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
}

export function getStoredSidebarWidth(): number {
  if (typeof window === "undefined") return DEFAULT_WIDTH;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return DEFAULT_WIDTH;
  const parsed = parseInt(stored, 10);
  if (isNaN(parsed)) return DEFAULT_WIDTH;
  return clampWidth(parsed);
}

export function getServerSnapshot(): number {
  return DEFAULT_WIDTH;
}

export function setStoredSidebarWidth(width: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, String(clampWidth(width)));
}

/**
 * Hook to manage sidebar width with localStorage persistence.
 */
export function useSidebarWidth() {
  const width = useSyncExternalStore(subscribe, getStoredSidebarWidth, getServerSnapshot);

  const setWidth = useCallback((newWidth: number) => {
    const clamped = clampWidth(newWidth);
    setStoredSidebarWidth(clamped);
    emitChange();
  }, []);

  return { width, setWidth, minWidth: MIN_WIDTH, maxWidth: MAX_WIDTH };
}

/**
 * Initialize sidebar width from server-provided value (from DB).
 */
export function useSidebarWidthInit(serverWidth?: number | null) {
  useEffect(() => {
    // Priority: localStorage > serverWidth (from DB) > default
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return; // localStorage takes priority
    }

    if (serverWidth && serverWidth >= MIN_WIDTH && serverWidth <= MAX_WIDTH) {
      setStoredSidebarWidth(serverWidth);
      emitChange();
    }
  }, [serverWidth]);
}

export { DEFAULT_WIDTH, MIN_WIDTH, MAX_WIDTH };
