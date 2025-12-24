import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    DEFAULT_FONT,
    FONTS,
    applyFontToDocument,
    fontRegistry,
    getCurrentFont,
    getFontInfo,
    getStoredFontName,
    isValidFont,
    setStoredFontName,
} from "./index";

describe("fonts", () => {
  describe("FONTS constant", () => {
    it("contains expected font names", () => {
      expect(FONTS).toContain("geist");
      expect(FONTS).toContain("inter");
      expect(FONTS).toContain("roboto");
      expect(FONTS).toContain("nunito");
      expect(FONTS).toContain("open-sans");
      expect(FONTS).toContain("lato");
      expect(FONTS).toContain("agave");
    });

    it("has exactly 12 fonts", () => {
      expect(FONTS).toHaveLength(12);
    });
  });

  describe("DEFAULT_FONT", () => {
    it("is geist", () => {
      expect(DEFAULT_FONT).toBe("geist");
    });
  });

  describe("fontRegistry", () => {
    it("has entries for all fonts", () => {
      expect(fontRegistry).toHaveLength(FONTS.length);
      for (const font of FONTS) {
        expect(fontRegistry.find((f) => f.name === font)).toBeDefined();
      }
    });

    it("each entry has required properties", () => {
      for (const entry of fontRegistry) {
        expect(entry).toHaveProperty("name");
        expect(entry).toHaveProperty("label");
        expect(entry).toHaveProperty("description");
        expect(entry).toHaveProperty("variable");
        expect(typeof entry.name).toBe("string");
        expect(typeof entry.label).toBe("string");
        expect(typeof entry.description).toBe("string");
        expect(typeof entry.variable).toBe("string");
      }
    });
  });

  describe("isValidFont", () => {
    it("returns true for valid font names", () => {
      expect(isValidFont("geist")).toBe(true);
      expect(isValidFont("inter")).toBe(true);
      expect(isValidFont("roboto")).toBe(true);
      expect(isValidFont("nunito")).toBe(true);
      expect(isValidFont("open-sans")).toBe(true);
      expect(isValidFont("lato")).toBe(true);
    });

    it("returns false for invalid font names", () => {
      expect(isValidFont("invalid")).toBe(false);
      expect(isValidFont("")).toBe(false);
      expect(isValidFont("GEIST")).toBe(false);
    });
  });

  describe("getFontInfo", () => {
    it("returns font info for valid fonts", () => {
      const info = getFontInfo("inter");
      expect(info).toBeDefined();
      expect(info?.name).toBe("inter");
      expect(info?.label).toBe("Inter");
      expect(info?.variable).toBe("--font-inter");
    });

    it("returns undefined for fonts not in registry", () => {
      // Cast to bypass TypeScript for testing
      const info = getFontInfo("invalid" as "geist");
      expect(info).toBeUndefined();
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

    describe("applyFontToDocument", () => {
      it("sets data-font attribute and --font-sans property on document", () => {
        const mockSetAttribute = vi.fn();
        const mockSetProperty = vi.fn();
        globalThis.document = {
          documentElement: {
            setAttribute: mockSetAttribute,
            style: {
              setProperty: mockSetProperty,
            },
          },
        } as unknown as Document;

        applyFontToDocument("inter");
        expect(mockSetAttribute).toHaveBeenCalledWith("data-font", "inter");
        expect(mockSetProperty).toHaveBeenCalledWith("--font-sans", "var(--font-inter)");
      });

      it("handles undefined document gracefully", () => {
        globalThis.document = undefined as unknown as Document;
        expect(() => applyFontToDocument("inter")).not.toThrow();
      });

      it("handles invalid font gracefully", () => {
        const mockSetAttribute = vi.fn();
        globalThis.document = {
          documentElement: {
            setAttribute: mockSetAttribute,
          },
        } as unknown as Document;

        // Cast to bypass TypeScript for testing
        applyFontToDocument("invalid" as "geist");
        expect(mockSetAttribute).not.toHaveBeenCalled();
      });
    });

    describe("getCurrentFont", () => {
      it("returns font from data-font attribute", () => {
        globalThis.document = {
          documentElement: {
            getAttribute: vi.fn().mockReturnValue("roboto"),
          },
        } as unknown as Document;

        expect(getCurrentFont()).toBe("roboto");
      });

      it("returns default when attribute is null", () => {
        globalThis.document = {
          documentElement: {
            getAttribute: vi.fn().mockReturnValue(null),
          },
        } as unknown as Document;

        expect(getCurrentFont()).toBe("geist");
      });

      it("returns default when attribute is invalid", () => {
        globalThis.document = {
          documentElement: {
            getAttribute: vi.fn().mockReturnValue("invalid-font"),
          },
        } as unknown as Document;

        expect(getCurrentFont()).toBe("geist");
      });

      it("returns default when document is undefined", () => {
        globalThis.document = undefined as unknown as Document;
        expect(getCurrentFont()).toBe("geist");
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

    describe("getStoredFontName", () => {
      it("returns stored font name", () => {
        globalThis.localStorage = {
          getItem: vi.fn().mockReturnValue("nunito"),
        } as unknown as Storage;

        expect(getStoredFontName()).toBe("nunito");
      });

      it("returns default when storage is empty", () => {
        globalThis.localStorage = {
          getItem: vi.fn().mockReturnValue(null),
        } as unknown as Storage;

        expect(getStoredFontName()).toBe("geist");
      });

      it("returns default when stored value is invalid", () => {
        globalThis.localStorage = {
          getItem: vi.fn().mockReturnValue("invalid"),
        } as unknown as Storage;

        expect(getStoredFontName()).toBe("geist");
      });

      it("returns default when localStorage is undefined", () => {
        globalThis.localStorage = undefined as unknown as Storage;
        expect(getStoredFontName()).toBe("geist");
      });
    });

    describe("setStoredFontName", () => {
      it("stores font name in localStorage", () => {
        const mockSetItem = vi.fn();
        globalThis.localStorage = {
          setItem: mockSetItem,
        } as unknown as Storage;

        setStoredFontName("lato");
        expect(mockSetItem).toHaveBeenCalledWith("dashboard-font", "lato");
      });

      it("handles undefined localStorage gracefully", () => {
        globalThis.localStorage = undefined as unknown as Storage;
        expect(() => setStoredFontName("lato")).not.toThrow();
      });
    });
  });
});
