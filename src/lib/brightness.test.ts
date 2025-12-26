import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    adjustLightness,
    adjustOklchColor,
    applyBrightnessToDocument,
    DEFAULT_BRIGHTNESS,
    getStoredBrightness,
    parseOklchLightness,
    replaceOklchLightness,
    resetBrightnessOnDocument,
    setStoredBrightness,
    type BrightnessSettings,
} from "./brightness";

describe("brightness utilities", () => {
  describe("adjustLightness", () => {
    it("returns original lightness when brightness is 100", () => {
      expect(adjustLightness(0.5, 100)).toBe(0.5);
      expect(adjustLightness(0.2, 100)).toBe(0.2);
      expect(adjustLightness(0.8, 100)).toBe(0.8);
    });

    it("darkens when brightness is below 100", () => {
      expect(adjustLightness(0.5, 50)).toBe(0.25);
      expect(adjustLightness(0.8, 50)).toBe(0.4);
      expect(adjustLightness(0.5, 0)).toBe(0);
    });

    it("brightens when brightness is above 100", () => {
      expect(adjustLightness(0.5, 150)).toBe(0.75);
      expect(adjustLightness(0.4, 200)).toBe(0.8);
    });

    it("clamps to valid range 0-1", () => {
      expect(adjustLightness(0.8, 200)).toBe(1);
      expect(adjustLightness(0.1, 0)).toBe(0);
      expect(adjustLightness(1, 150)).toBe(1);
      expect(adjustLightness(0, 50)).toBe(0);
    });
  });

  describe("parseOklchLightness", () => {
    it("extracts lightness from valid OKLCH strings", () => {
      expect(parseOklchLightness("oklch(0.5 0.2 180)")).toBe(0.5);
      expect(parseOklchLightness("oklch(0.205 0 0)")).toBe(0.205);
      expect(parseOklchLightness("oklch(0.985 0 0)")).toBe(0.985);
      expect(parseOklchLightness("oklch(1 0 0 / 10%)")).toBe(1);
    });

    it("handles whitespace variations", () => {
      expect(parseOklchLightness("oklch( 0.5 0.2 180 )")).toBe(0.5);
      expect(parseOklchLightness("oklch(0.5  0.2  180)")).toBe(0.5);
    });

    it("returns null for invalid strings", () => {
      expect(parseOklchLightness("")).toBeNull();
      expect(parseOklchLightness("rgb(255, 0, 0)")).toBeNull();
      expect(parseOklchLightness("invalid")).toBeNull();
    });
  });

  describe("replaceOklchLightness", () => {
    it("replaces lightness value in OKLCH string", () => {
      expect(replaceOklchLightness("oklch(0.5 0.2 180)", 0.75)).toBe("oklch(0.750 0.2 180)");
      expect(replaceOklchLightness("oklch(0.205 0 0)", 0.5)).toBe("oklch(0.500 0 0)");
    });

    it("preserves alpha channel", () => {
      expect(replaceOklchLightness("oklch(1 0 0 / 10%)", 0.5)).toBe("oklch(0.500 0 0 / 10%)");
    });

    it("formats with 3 decimal places", () => {
      expect(replaceOklchLightness("oklch(0.5 0.2 180)", 0.12345)).toBe("oklch(0.123 0.2 180)");
    });
  });

  describe("adjustOklchColor", () => {
    it("adjusts OKLCH color string brightness", () => {
      const result = adjustOklchColor("oklch(0.5 0.2 180)", 150);
      expect(parseOklchLightness(result)).toBe(0.75);
    });

    it("returns original string if parsing fails", () => {
      const invalid = "rgb(255, 0, 0)";
      expect(adjustOklchColor(invalid, 150)).toBe(invalid);
    });

    it("handles extreme brightness values", () => {
      const darkened = adjustOklchColor("oklch(0.5 0.2 180)", 0);
      expect(parseOklchLightness(darkened)).toBe(0);

      const brightened = adjustOklchColor("oklch(0.8 0.2 180)", 200);
      expect(parseOklchLightness(brightened)).toBe(1);
    });
  });

  describe("localStorage operations", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    describe("getStoredBrightness", () => {
      it("returns default when nothing is stored", () => {
        expect(getStoredBrightness()).toEqual(DEFAULT_BRIGHTNESS);
      });

      it("returns stored brightness settings", () => {
        const settings: BrightnessSettings = {
          fgLight: 120,
          bgLight: 80,
          fgDark: 90,
          bgDark: 110,
        };
        localStorage.setItem("brightness-settings", JSON.stringify(settings));
        expect(getStoredBrightness()).toEqual(settings);
      });

      it("returns default for invalid JSON", () => {
        localStorage.setItem("brightness-settings", "invalid json");
        expect(getStoredBrightness()).toEqual(DEFAULT_BRIGHTNESS);
      });

      it("fills in missing values with defaults", () => {
        localStorage.setItem("brightness-settings", JSON.stringify({ fgLight: 150 }));
        const result = getStoredBrightness();
        expect(result.fgLight).toBe(150);
        expect(result.bgLight).toBe(DEFAULT_BRIGHTNESS.bgLight);
        expect(result.fgDark).toBe(DEFAULT_BRIGHTNESS.fgDark);
        expect(result.bgDark).toBe(DEFAULT_BRIGHTNESS.bgDark);
      });
    });

    describe("setStoredBrightness", () => {
      it("stores brightness settings to localStorage", () => {
        const settings: BrightnessSettings = {
          fgLight: 130,
          bgLight: 70,
          fgDark: 95,
          bgDark: 105,
        };
        setStoredBrightness(settings);
        expect(localStorage.getItem("brightness-settings")).toBe(JSON.stringify(settings));
      });
    });
  });

  describe("document operations", () => {
    beforeEach(() => {
      // Reset document styles
      document.documentElement.style.cssText = "";

      // Mock getComputedStyle
      vi.spyOn(window, "getComputedStyle").mockReturnValue({
        getPropertyValue: (prop: string) => {
          const mockStyles: Record<string, string> = {
            "--foreground": "oklch(0.5 0.2 180)",
            "--background": "oklch(0.9 0.1 180)",
            "--primary": "oklch(0.3 0.25 240)",
            "--primary-foreground": "oklch(0.95 0.05 240)",
            "--muted": "oklch(0.85 0.05 180)",
            "--muted-foreground": "oklch(0.4 0.15 180)",
          };
          return mockStyles[prop] || "";
        },
      } as CSSStyleDeclaration);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe("applyBrightnessToDocument", () => {
      it("applies brightness adjustments to CSS variables", () => {
        const settings: BrightnessSettings = {
          fgLight: 150,
          bgLight: 80,
          fgDark: 100,
          bgDark: 100,
        };

        applyBrightnessToDocument(settings, false);

        const root = document.documentElement;
        const fgValue = root.style.getPropertyValue("--foreground");
        const bgValue = root.style.getPropertyValue("--background");

        expect(fgValue).toBeTruthy();
        expect(bgValue).toBeTruthy();

        // Check that values were adjusted
        const fgLightness = parseOklchLightness(fgValue);
        const bgLightness = parseOklchLightness(bgValue);

        expect(fgLightness).toBeGreaterThan(0.5); // brightened
        expect(bgLightness).toBeLessThan(0.9); // darkened
      });

      it("uses dark mode settings when isDark is true", () => {
        const settings: BrightnessSettings = {
          fgLight: 100,
          bgLight: 100,
          fgDark: 50,
          bgDark: 150,
        };

        applyBrightnessToDocument(settings, true);

        const root = document.documentElement;
        const fgValue = root.style.getPropertyValue("--foreground");
        const bgValue = root.style.getPropertyValue("--background");

        expect(fgValue).toBeTruthy();
        expect(bgValue).toBeTruthy();

        const fgLightness = parseOklchLightness(fgValue);
        const bgLightness = parseOklchLightness(bgValue);

        expect(fgLightness).toBeLessThan(0.5); // darkened with dark mode setting
        expect(bgLightness).toBeGreaterThan(0.9); // brightened with dark mode setting
      });

      it("handles default brightness (100) without changes", () => {
        applyBrightnessToDocument(DEFAULT_BRIGHTNESS, false);

        const root = document.documentElement;
        const fgValue = root.style.getPropertyValue("--foreground");

        // Should still set values even at 100%
        expect(fgValue).toBeTruthy();

        const fgLightness = parseOklchLightness(fgValue);
        expect(fgLightness).toBe(0.5); // unchanged
      });
    });

    describe("resetBrightnessOnDocument", () => {
      it("removes all brightness adjustments", () => {
        const settings: BrightnessSettings = {
          fgLight: 150,
          bgLight: 80,
          fgDark: 100,
          bgDark: 100,
        };

        // First apply
        applyBrightnessToDocument(settings, false);

        const root = document.documentElement;
        expect(root.style.getPropertyValue("--foreground")).toBeTruthy();
        expect(root.style.getPropertyValue("--background")).toBeTruthy();

        // Then reset
        resetBrightnessOnDocument();

        expect(root.style.getPropertyValue("--foreground")).toBe("");
        expect(root.style.getPropertyValue("--background")).toBe("");
        expect(root.style.getPropertyValue("--primary")).toBe("");
      });
    });
  });

  describe("DEFAULT_BRIGHTNESS constant", () => {
    it("has correct default values", () => {
      expect(DEFAULT_BRIGHTNESS).toEqual({
        fgLight: 100,
        bgLight: 100,
        fgDark: 100,
        bgDark: 100,
      });
    });
  });
});
