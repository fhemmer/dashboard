import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
    DEFAULT_WIDTH,
    MAX_WIDTH,
    MIN_WIDTH,
    clampWidth,
    getServerSnapshot,
    getStoredSidebarWidth,
    setStoredSidebarWidth,
    useSidebarWidth,
    useSidebarWidthInit,
} from "./use-sidebar-width";

describe("use-sidebar-width", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("constants", () => {
    it("has correct default values", () => {
      expect(DEFAULT_WIDTH).toBe(256);
      expect(MIN_WIDTH).toBe(200);
      expect(MAX_WIDTH).toBe(400);
    });
  });

  describe("clampWidth", () => {
    it("returns value when within range", () => {
      expect(clampWidth(300)).toBe(300);
    });

    it("clamps to minimum when below range", () => {
      expect(clampWidth(100)).toBe(MIN_WIDTH);
    });

    it("clamps to maximum when above range", () => {
      expect(clampWidth(500)).toBe(MAX_WIDTH);
    });

    it("handles edge cases at boundaries", () => {
      expect(clampWidth(MIN_WIDTH)).toBe(MIN_WIDTH);
      expect(clampWidth(MAX_WIDTH)).toBe(MAX_WIDTH);
    });
  });

  describe("getStoredSidebarWidth", () => {
    it("returns default width when nothing stored", () => {
      expect(getStoredSidebarWidth()).toBe(DEFAULT_WIDTH);
    });

    it("returns stored width from localStorage", () => {
      localStorage.setItem("dashboard-sidebar-width", "300");
      expect(getStoredSidebarWidth()).toBe(300);
    });

    it("returns default for invalid stored value", () => {
      localStorage.setItem("dashboard-sidebar-width", "invalid");
      expect(getStoredSidebarWidth()).toBe(DEFAULT_WIDTH);
    });

    it("clamps stored value to valid range", () => {
      localStorage.setItem("dashboard-sidebar-width", "500");
      expect(getStoredSidebarWidth()).toBe(MAX_WIDTH);
    });
  });

  describe("setStoredSidebarWidth", () => {
    it("stores width in localStorage", () => {
      setStoredSidebarWidth(300);
      expect(localStorage.getItem("dashboard-sidebar-width")).toBe("300");
    });

    it("clamps width before storing", () => {
      setStoredSidebarWidth(500);
      expect(localStorage.getItem("dashboard-sidebar-width")).toBe(String(MAX_WIDTH));
    });
  });

  describe("getServerSnapshot", () => {
    it("returns default width for SSR", () => {
      expect(getServerSnapshot()).toBe(DEFAULT_WIDTH);
    });
  });

  describe("useSidebarWidth hook", () => {
    it("returns default width when no width stored", () => {
      const { result } = renderHook(() => useSidebarWidth());
      expect(result.current.width).toBe(DEFAULT_WIDTH);
    });

    it("returns stored width from localStorage", () => {
      localStorage.setItem("dashboard-sidebar-width", "320");
      const { result } = renderHook(() => useSidebarWidth());
      expect(result.current.width).toBe(320);
    });

    it("provides min and max width constraints", () => {
      const { result } = renderHook(() => useSidebarWidth());
      expect(result.current.minWidth).toBe(MIN_WIDTH);
      expect(result.current.maxWidth).toBe(MAX_WIDTH);
    });

    it("setWidth updates localStorage", () => {
      const { result } = renderHook(() => useSidebarWidth());

      act(() => {
        result.current.setWidth(350);
      });

      expect(localStorage.getItem("dashboard-sidebar-width")).toBe("350");
    });

    it("setWidth clamps values outside range", () => {
      const { result } = renderHook(() => useSidebarWidth());

      act(() => {
        result.current.setWidth(100);
      });

      expect(localStorage.getItem("dashboard-sidebar-width")).toBe(String(MIN_WIDTH));
    });

    it("notifies listeners when width changes", () => {
      const { result, rerender } = renderHook(() => useSidebarWidth());

      act(() => {
        result.current.setWidth(280);
      });

      rerender();

      expect(result.current.width).toBe(280);
    });
  });

  describe("useSidebarWidthInit hook", () => {
    it("does nothing when localStorage has value", () => {
      localStorage.setItem("dashboard-sidebar-width", "300");
      renderHook(() => useSidebarWidthInit(350));

      expect(localStorage.getItem("dashboard-sidebar-width")).toBe("300");
    });

    it("applies server width when localStorage is empty", () => {
      renderHook(() => useSidebarWidthInit(320));

      expect(localStorage.getItem("dashboard-sidebar-width")).toBe("320");
    });

    it("ignores invalid server width (below min)", () => {
      renderHook(() => useSidebarWidthInit(100));

      expect(localStorage.getItem("dashboard-sidebar-width")).toBeNull();
    });

    it("ignores invalid server width (above max)", () => {
      renderHook(() => useSidebarWidthInit(500));

      expect(localStorage.getItem("dashboard-sidebar-width")).toBeNull();
    });

    it("handles null server width", () => {
      renderHook(() => useSidebarWidthInit(null));

      expect(localStorage.getItem("dashboard-sidebar-width")).toBeNull();
    });

    it("handles undefined server width", () => {
      renderHook(() => useSidebarWidthInit(undefined));

      expect(localStorage.getItem("dashboard-sidebar-width")).toBeNull();
    });
  });
});
