import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getServerSnapshot, useTheme, useThemeInit } from "./use-theme";

describe("useTheme", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset document attribute
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  describe("useTheme hook", () => {
    it("returns default theme when no theme is stored", () => {
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe("default");
    });

    it("returns stored theme from localStorage", () => {
      localStorage.setItem("theme-name", "ocean");
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe("ocean");
    });

    it("setTheme updates localStorage and document", () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme("forest");
      });

      expect(localStorage.getItem("theme-name")).toBe("forest");
      expect(document.documentElement.getAttribute("data-theme")).toBe("forest");
    });

    it("setTheme ignores invalid themes", () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme("invalid" as "default");
      });

      // Should still be default (not set)
      expect(localStorage.getItem("theme-name")).toBeNull();
    });

    it("applies theme to document on mount", () => {
      localStorage.setItem("theme-name", "sunset");
      renderHook(() => useTheme());

      expect(document.documentElement.getAttribute("data-theme")).toBe("sunset");
    });

    it("notifies listeners when theme changes", () => {
      const { result, rerender } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme("ocean");
      });

      // Rerender to pick up state change
      rerender();

      expect(result.current.theme).toBe("ocean");
    });
  });

  describe("getServerSnapshot", () => {
    it("returns default theme for SSR", () => {
      expect(getServerSnapshot()).toBe("default");
    });
  });

  describe("useThemeInit hook", () => {
    it("applies stored theme from localStorage", () => {
      localStorage.setItem("theme-name", "ocean");
      renderHook(() => useThemeInit());

      expect(document.documentElement.getAttribute("data-theme")).toBe("ocean");
    });

    it("applies server theme when localStorage is default", () => {
      localStorage.setItem("theme-name", "default");
      renderHook(() => useThemeInit("forest"));

      expect(document.documentElement.getAttribute("data-theme")).toBe("forest");
      expect(localStorage.getItem("theme-name")).toBe("forest");
    });

    it("applies default when no stored or server theme", () => {
      renderHook(() => useThemeInit());

      expect(document.documentElement.getAttribute("data-theme")).toBe("default");
    });

    it("ignores invalid server theme", () => {
      renderHook(() => useThemeInit("invalid-theme"));

      expect(document.documentElement.getAttribute("data-theme")).toBe("default");
    });

    it("prefers localStorage over server theme", () => {
      localStorage.setItem("theme-name", "sunset");
      renderHook(() => useThemeInit("ocean"));

      expect(document.documentElement.getAttribute("data-theme")).toBe("sunset");
    });
  });
});
