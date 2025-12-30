import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    adjustColorBrightness,
    adjustHexColor,
    adjustLabColor,
    adjustLightness,
    adjustOklchColor,
    adjustRgbColor,
    applyBrightnessToDocument,
    clearBrightnessCache,
    DEFAULT_BRIGHTNESS,
    getStoredBrightness,
    parseHexToRgb,
    parseLab,
    parseOklchLightness,
    parseRgb,
    replaceOklchLightness,
    resetBrightnessOnDocument,
    rgbToHex,
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

  describe("parseHexToRgb", () => {
    it("parses 6-digit hex colors", () => {
      expect(parseHexToRgb("#ff0000")).toEqual([255, 0, 0]);
      expect(parseHexToRgb("#00ff00")).toEqual([0, 255, 0]);
      expect(parseHexToRgb("#0000ff")).toEqual([0, 0, 255]);
      expect(parseHexToRgb("#ffffff")).toEqual([255, 255, 255]);
      expect(parseHexToRgb("#000000")).toEqual([0, 0, 0]);
    });

    it("parses hex without # prefix", () => {
      expect(parseHexToRgb("ff0000")).toEqual([255, 0, 0]);
      expect(parseHexToRgb("eaeff5")).toEqual([234, 239, 245]);
    });

    it("parses 3-digit shorthand hex", () => {
      expect(parseHexToRgb("#f00")).toEqual([255, 0, 0]);
      expect(parseHexToRgb("#0f0")).toEqual([0, 255, 0]);
      expect(parseHexToRgb("#00f")).toEqual([0, 0, 255]);
      expect(parseHexToRgb("fff")).toEqual([255, 255, 255]);
    });

    it("returns null for invalid strings", () => {
      expect(parseHexToRgb("")).toBeNull();
      expect(parseHexToRgb("invalid")).toBeNull();
      expect(parseHexToRgb("rgb(255,0,0)")).toBeNull();
    });
  });

  describe("rgbToHex", () => {
    it("converts RGB to hex", () => {
      expect(rgbToHex(255, 0, 0)).toBe("#ff0000");
      expect(rgbToHex(0, 255, 0)).toBe("#00ff00");
      expect(rgbToHex(0, 0, 255)).toBe("#0000ff");
      expect(rgbToHex(255, 255, 255)).toBe("#ffffff");
      expect(rgbToHex(0, 0, 0)).toBe("#000000");
    });

    it("clamps values to valid range", () => {
      expect(rgbToHex(300, 0, 0)).toBe("#ff0000");
      expect(rgbToHex(-10, 0, 0)).toBe("#000000");
      expect(rgbToHex(128, 256, 512)).toBe("#80ffff");
    });

    it("rounds fractional values", () => {
      expect(rgbToHex(127.5, 0, 0)).toBe("#800000");
      expect(rgbToHex(127.4, 0, 0)).toBe("#7f0000");
    });
  });

  describe("adjustHexColor", () => {
    it("adjusts hex color brightness", () => {
      expect(adjustHexColor("#808080", 100)).toBe("#808080");
      expect(adjustHexColor("#808080", 50)).toBe("#404040");
      expect(adjustHexColor("#808080", 200)).toBe("#ffffff");
    });

    it("returns original for invalid hex", () => {
      expect(adjustHexColor("invalid", 150)).toBe("invalid");
    });

    it("clamps brightened values to max 255", () => {
      const result = adjustHexColor("#ff0000", 200);
      expect(result).toBe("#ff0000"); // Can't go brighter than ff
    });
  });

  describe("parseRgb", () => {
    it("parses rgb colors", () => {
      expect(parseRgb("rgb(255, 0, 0)")).toEqual({ r: 255, g: 0, b: 0 });
      expect(parseRgb("rgb(0, 255, 0)")).toEqual({ r: 0, g: 255, b: 0 });
      expect(parseRgb("rgb(128, 128, 128)")).toEqual({ r: 128, g: 128, b: 128 });
    });

    it("parses rgba colors", () => {
      expect(parseRgb("rgba(255, 0, 0, 0.5)")).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
      expect(parseRgb("rgba(0, 0, 0, 1)")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
      expect(parseRgb("rgba(255, 255, 255, 0)")).toEqual({ r: 255, g: 255, b: 255, a: 0 });
    });

    it("returns null for invalid strings", () => {
      expect(parseRgb("")).toBeNull();
      expect(parseRgb("invalid")).toBeNull();
      expect(parseRgb("#ff0000")).toBeNull();
    });
  });

  describe("adjustRgbColor", () => {
    it("adjusts rgb color brightness", () => {
      expect(adjustRgbColor("rgb(128, 128, 128)", 100)).toBe("rgb(128, 128, 128)");
      expect(adjustRgbColor("rgb(128, 128, 128)", 50)).toBe("rgb(64, 64, 64)");
      expect(adjustRgbColor("rgb(100, 100, 100)", 200)).toBe("rgb(200, 200, 200)");
    });

    it("preserves alpha in rgba colors", () => {
      expect(adjustRgbColor("rgba(128, 128, 128, 0.5)", 50)).toBe("rgba(64, 64, 64, 0.5)");
    });

    it("returns original for invalid format", () => {
      expect(adjustRgbColor("invalid", 150)).toBe("invalid");
    });
  });

  describe("parseLab", () => {
    it("parses basic lab color", () => {
      expect(parseLab("lab(94.1916% -1.09133 -3.56996)")).toEqual({
        l: 94.1916,
        a: -1.09133,
        b: -3.56996,
        alpha: undefined,
      });
    });

    it("parses lab color with alpha", () => {
      expect(parseLab("lab(50% 10 20 / 0.5)")).toEqual({
        l: 50,
        a: 10,
        b: 20,
        alpha: 0.5,
      });
    });

    it("parses lab color with negative values", () => {
      expect(parseLab("lab(2.40103% -.464223 -7.8273)")).toEqual({
        l: 2.40103,
        a: -0.464223,
        b: -7.8273,
        alpha: undefined,
      });
    });

    it("returns null for invalid format", () => {
      expect(parseLab("rgb(255, 0, 0)")).toBeNull();
      expect(parseLab("lab(invalid)")).toBeNull();
      expect(parseLab("#ff0000")).toBeNull();
    });

    it("ignores invalid alpha values after slash", () => {
      const result = parseLab("lab(50% 10 20 / invalid)");
      expect(result).toEqual({
        l: 50,
        a: 10,
        b: 20,
        // alpha should be undefined since "invalid" is NaN
      });
      expect(result?.alpha).toBeUndefined();
    });

    it("returns null for wrong number of components", () => {
      expect(parseLab("lab(50% 10)")).toBeNull();  // only 2 components
      expect(parseLab("lab(50%)")).toBeNull();  // only 1 component
    });

    it("returns null when L is not a percentage", () => {
      expect(parseLab("lab(50 10 20)")).toBeNull();  // missing % sign
    });
  });

  describe("adjustLabColor", () => {
    it("increases lightness for brightness > 100", () => {
      expect(adjustLabColor("lab(50% 10 20)", 150)).toBe("lab(75% 10 20)");
    });

    it("decreases lightness for brightness < 100", () => {
      expect(adjustLabColor("lab(50% 10 20)", 50)).toBe("lab(25% 10 20)");
    });

    it("clamps lightness to 0-100 range", () => {
      expect(adjustLabColor("lab(80% 10 20)", 200)).toBe("lab(100% 10 20)");
      expect(adjustLabColor("lab(20% 10 20)", 0)).toBe("lab(0% 10 20)");
    });

    it("preserves alpha value", () => {
      expect(adjustLabColor("lab(50% 10 20 / 0.5)", 150)).toBe("lab(75% 10 20 / 0.5)");
    });

    it("preserves negative a and b values", () => {
      expect(adjustLabColor("lab(50% -10 -20)", 150)).toBe("lab(75% -10 -20)");
    });

    it("returns original for invalid format", () => {
      expect(adjustLabColor("rgb(255, 0, 0)", 150)).toBe("rgb(255, 0, 0)");
    });
  });

  describe("adjustColorBrightness", () => {
    it("returns original when brightness is 100", () => {
      expect(adjustColorBrightness("#ff0000", 100)).toBe("#ff0000");
      expect(adjustColorBrightness("rgb(255, 0, 0)", 100)).toBe("rgb(255, 0, 0)");
      expect(adjustColorBrightness("oklch(0.5 0.2 180)", 100)).toBe("oklch(0.5 0.2 180)");
      expect(adjustColorBrightness("lab(50% 10 20)", 100)).toBe("lab(50% 10 20)");
    });

    it("detects and adjusts lab colors (browser computed format)", () => {
      expect(adjustColorBrightness("lab(50% 10 20)", 150)).toBe("lab(75% 10 20)");
      expect(adjustColorBrightness("lab(94.1916% -1.09133 -3.56996)", 50)).toBe("lab(47.096% -1.09133 -3.56996)");
    });

    it("detects and adjusts oklch colors", () => {
      const result = adjustColorBrightness("oklch(0.5 0.2 180)", 150);
      expect(result).toContain("oklch(");
      expect(parseOklchLightness(result)).toBe(0.75);
    });

    it("detects and adjusts hex colors", () => {
      expect(adjustColorBrightness("#808080", 50)).toBe("#404040");
    });

    it("detects and adjusts rgb colors", () => {
      expect(adjustColorBrightness("rgb(128, 128, 128)", 50)).toBe("rgb(64, 64, 64)");
    });

    it("returns unknown formats unchanged", () => {
      expect(adjustColorBrightness("hsl(0, 100%, 50%)", 150)).toBe("hsl(0, 100%, 50%)");
      expect(adjustColorBrightness("unknown", 150)).toBe("unknown");
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
      document.documentElement.style.cssText = "";
      clearBrightnessCache();
      // Set up mock CSS variables - use lab() colors like the real browser does after CSS processing
      vi.spyOn(window, "getComputedStyle").mockImplementation(() => ({
        getPropertyValue: (prop: string) => {
          const vars: Record<string, string> = {
            "--foreground": "lab(94.1916% -1.09133 -3.56996)",
            "--background": "lab(2.40103% -.464223 -7.8273)",
            "--primary": "lab(58.7199% -5.55909 -50.5326)",
            "--primary-foreground": "lab(3.50% -1 -3)",
            "--muted-foreground": "lab(60% -2 -10)",
          };
          return vars[prop] || "";
        },
      }) as CSSStyleDeclaration);
    });

    afterEach(() => {
      document.documentElement.style.cssText = "";
      clearBrightnessCache();
      vi.restoreAllMocks();
    });

    describe("applyBrightnessToDocument", () => {
      it("applies CSS variable adjustments when foreground brightness is not default", () => {
        const settings: BrightnessSettings = {
          fgLight: 120,
          bgLight: 100,
          fgDark: 100,
          bgDark: 100,
        };

        applyBrightnessToDocument(settings, false);

        const root = document.documentElement;
        // Should have set foreground variable with adjusted lab() brightness
        const fg = root.style.getPropertyValue("--foreground");
        expect(fg).toBeTruthy();
        expect(fg).toMatch(/^lab\(/);
      });

      it("applies CSS variable adjustments when background brightness is not default", () => {
        const settings: BrightnessSettings = {
          fgLight: 100,
          bgLight: 120,
          fgDark: 100,
          bgDark: 100,
        };

        applyBrightnessToDocument(settings, false);

        const root = document.documentElement;
        // Should have set background variable with adjusted lab() brightness
        const bg = root.style.getPropertyValue("--background");
        expect(bg).toBeTruthy();
        expect(bg).toMatch(/^lab\(/);
      });

      it("applies correct adjustments for dark mode", () => {
        const settings: BrightnessSettings = {
          fgLight: 100,
          bgLight: 100,
          fgDark: 80,
          bgDark: 80,
        };

        applyBrightnessToDocument(settings, true);

        const root = document.documentElement;
        // Should have adjusted foreground and background for dark mode
        expect(root.style.getPropertyValue("--foreground")).toBeTruthy();
        expect(root.style.getPropertyValue("--background")).toBeTruthy();
      });

      it("removes style overrides when brightness is at default", () => {
        // First apply non-default brightness
        applyBrightnessToDocument({ fgLight: 150, bgLight: 150, fgDark: 100, bgDark: 100 }, false);

        const root = document.documentElement;
        expect(root.style.getPropertyValue("--foreground")).toBeTruthy();

        // Now apply default brightness
        applyBrightnessToDocument(DEFAULT_BRIGHTNESS, false);

        // Should have removed the inline style overrides
        expect(root.style.getPropertyValue("--foreground")).toBe("");
        expect(root.style.getPropertyValue("--background")).toBe("");
      });

      it("adjusts foreground independently from background", () => {
        const settings: BrightnessSettings = {
          fgLight: 140,
          bgLight: 100,
          fgDark: 100,
          bgDark: 100,
        };

        applyBrightnessToDocument(settings, false);

        const root = document.documentElement;
        // Foreground should be adjusted
        expect(root.style.getPropertyValue("--foreground")).toBeTruthy();
        // Background should not be adjusted (brightness is 100)
        expect(root.style.getPropertyValue("--background")).toBe("");
      });

      it("adjusts background independently from foreground", () => {
        const settings: BrightnessSettings = {
          fgLight: 100,
          bgLight: 140,
          fgDark: 100,
          bgDark: 100,
        };

        applyBrightnessToDocument(settings, false);

        const root = document.documentElement;
        // Foreground should not be adjusted (brightness is 100)
        expect(root.style.getPropertyValue("--foreground")).toBe("");
        // Background should be adjusted
        expect(root.style.getPropertyValue("--background")).toBeTruthy();
      });

      it("handles brightness values above 100 by increasing lightness", () => {
        const settings: BrightnessSettings = {
          fgLight: 150,
          bgLight: 100,
          fgDark: 100,
          bgDark: 100,
        };

        applyBrightnessToDocument(settings, false);

        const root = document.documentElement;
        const fg = root.style.getPropertyValue("--foreground");
        // lab(94.1916% ...) with 150% brightness should clamp to 100%
        expect(fg).toBeTruthy();
        expect(fg).toMatch(/^lab\(/);
      });

      it("handles brightness values below 100 by decreasing lightness", () => {
        const settings: BrightnessSettings = {
          fgLight: 50,
          bgLight: 100,
          fgDark: 100,
          bgDark: 100,
        };

        applyBrightnessToDocument(settings, false);

        const root = document.documentElement;
        const fg = root.style.getPropertyValue("--foreground");
        // lab(94.1916% ...) with 50% brightness = lab(47.096% ...)
        expect(fg).toBe("lab(47.096% -1.09133 -3.56996)");
      });
    });

    describe("resetBrightnessOnDocument", () => {
      it("removes CSS variable overrides", () => {
        // First apply brightness
        applyBrightnessToDocument({ fgLight: 150, bgLight: 150, fgDark: 100, bgDark: 100 }, false);

        const root = document.documentElement;
        expect(root.style.getPropertyValue("--foreground")).toBeTruthy();
        expect(root.style.getPropertyValue("--background")).toBeTruthy();

        // Then reset
        resetBrightnessOnDocument();

        expect(root.style.getPropertyValue("--foreground")).toBe("");
        expect(root.style.getPropertyValue("--background")).toBe("");
      });

      it("clears the brightness cache", () => {
        // Apply brightness to populate cache
        applyBrightnessToDocument({ fgLight: 150, bgLight: 100, fgDark: 100, bgDark: 100 }, false);

        // Reset should clear cache
        resetBrightnessOnDocument();

        // Apply again - should re-read from computed styles
        applyBrightnessToDocument({ fgLight: 150, bgLight: 100, fgDark: 100, bgDark: 100 }, false);

        const root = document.documentElement;
        expect(root.style.getPropertyValue("--foreground")).toBeTruthy();
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
