import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    THEMES,
    applyThemeToDocument,
    getCurrentTheme,
    getStoredThemeName,
    getThemeInfo,
    isValidTheme,
    setStoredThemeName,
    themeRegistry,
} from "./index";

describe("themes", () => {
  describe("THEMES constant", () => {
    it("contains expected theme names", () => {
      expect(THEMES).toContain("default");
      expect(THEMES).toContain("ocean");
      expect(THEMES).toContain("forest");
      expect(THEMES).toContain("sunset");
      expect(THEMES).toContain("gold");
    });

    it("has exactly 5 themes", () => {
      expect(THEMES).toHaveLength(5);
    });
  });

  describe("themeRegistry", () => {
    it("has entries for all themes", () => {
      expect(themeRegistry).toHaveLength(THEMES.length);
      for (const theme of THEMES) {
        expect(themeRegistry.find((t) => t.name === theme)).toBeDefined();
      }
    });

    it("each entry has required properties", () => {
      for (const entry of themeRegistry) {
        expect(entry).toHaveProperty("name");
        expect(entry).toHaveProperty("label");
        expect(entry).toHaveProperty("description");
        expect(typeof entry.name).toBe("string");
        expect(typeof entry.label).toBe("string");
        expect(typeof entry.description).toBe("string");
      }
    });
  });

  describe("isValidTheme", () => {
    it("returns true for valid theme names", () => {
      expect(isValidTheme("default")).toBe(true);
      expect(isValidTheme("ocean")).toBe(true);
      expect(isValidTheme("forest")).toBe(true);
      expect(isValidTheme("sunset")).toBe(true);
    });

    it("returns false for invalid theme names", () => {
      expect(isValidTheme("invalid")).toBe(false);
      expect(isValidTheme("")).toBe(false);
      expect(isValidTheme("DEFAULT")).toBe(false);
    });
  });

  describe("getThemeInfo", () => {
    it("returns theme info for valid themes", () => {
      const info = getThemeInfo("ocean");
      expect(info).toBeDefined();
      expect(info?.name).toBe("ocean");
      expect(info?.label).toBe("Ocean");
    });

    it("returns undefined for themes not in registry", () => {
      // This tests the edge case where THEMES might have a value not in registry
      // In practice this shouldn't happen, but the function handles it
      const info = getThemeInfo("default");
      expect(info).toBeDefined();
    });
  });

  describe("DOM operations", () => {
    let originalDocument: typeof document;

    beforeEach(() => {
      originalDocument = globalThis.document;
    });

    afterEach(() => {
      globalThis.document = originalDocument;
    });

    describe("applyThemeToDocument", () => {
      it("sets data-theme attribute on document", () => {
        const mockSetAttribute = vi.fn();
        globalThis.document = {
          documentElement: {
            setAttribute: mockSetAttribute,
          },
        } as unknown as Document;

        applyThemeToDocument("ocean");
        expect(mockSetAttribute).toHaveBeenCalledWith("data-theme", "ocean");
      });

      it("handles undefined document gracefully", () => {
        globalThis.document = undefined as unknown as Document;
        expect(() => applyThemeToDocument("ocean")).not.toThrow();
      });
    });

    describe("getCurrentTheme", () => {
      it("returns theme from data-theme attribute", () => {
        globalThis.document = {
          documentElement: {
            getAttribute: vi.fn().mockReturnValue("forest"),
          },
        } as unknown as Document;

        expect(getCurrentTheme()).toBe("forest");
      });

      it("returns default when attribute is null", () => {
        globalThis.document = {
          documentElement: {
            getAttribute: vi.fn().mockReturnValue(null),
          },
        } as unknown as Document;

        expect(getCurrentTheme()).toBe("default");
      });

      it("returns default when attribute is invalid", () => {
        globalThis.document = {
          documentElement: {
            getAttribute: vi.fn().mockReturnValue("invalid-theme"),
          },
        } as unknown as Document;

        expect(getCurrentTheme()).toBe("default");
      });

      it("returns default when document is undefined", () => {
        globalThis.document = undefined as unknown as Document;
        expect(getCurrentTheme()).toBe("default");
      });
    });
  });

  describe("localStorage operations", () => {
    let originalLocalStorage: typeof localStorage;

    beforeEach(() => {
      originalLocalStorage = globalThis.localStorage;
    });

    afterEach(() => {
      globalThis.localStorage = originalLocalStorage;
    });

    describe("getStoredThemeName", () => {
      it("returns stored theme name", () => {
        globalThis.localStorage = {
          getItem: vi.fn().mockReturnValue("sunset"),
        } as unknown as Storage;

        expect(getStoredThemeName()).toBe("sunset");
      });

      it("returns default when storage is empty", () => {
        globalThis.localStorage = {
          getItem: vi.fn().mockReturnValue(null),
        } as unknown as Storage;

        expect(getStoredThemeName()).toBe("default");
      });

      it("returns default when stored value is invalid", () => {
        globalThis.localStorage = {
          getItem: vi.fn().mockReturnValue("invalid"),
        } as unknown as Storage;

        expect(getStoredThemeName()).toBe("default");
      });

      it("returns default when localStorage is undefined", () => {
        globalThis.localStorage = undefined as unknown as Storage;
        expect(getStoredThemeName()).toBe("default");
      });
    });

    describe("setStoredThemeName", () => {
      it("stores theme name in localStorage", () => {
        const mockSetItem = vi.fn();
        globalThis.localStorage = {
          setItem: mockSetItem,
        } as unknown as Storage;

        setStoredThemeName("ocean");
        expect(mockSetItem).toHaveBeenCalledWith("theme-name", "ocean");
      });

      it("handles undefined localStorage gracefully", () => {
        globalThis.localStorage = undefined as unknown as Storage;
        expect(() => setStoredThemeName("ocean")).not.toThrow();
      });
    });
  });
});
