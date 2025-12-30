import { describe, expect, it } from "vitest";
import {
  formatOklchString,
  hexToOklch,
  isValidHex,
  isValidOklch,
  oklchToHex,
  parseOklch,
  type OklchComponents,
} from "./color";

describe("color utilities", () => {
  describe("parseOklch", () => {
    it("parses valid OKLCH string", () => {
      const result = parseOklch("oklch(0.6 0.2 250)");
      expect(result).toEqual({
        l: expect.closeTo(0.6, 2),
        c: expect.closeTo(0.2, 2),
        h: expect.closeTo(250, 0),
        alpha: undefined,
      });
    });

    it("parses OKLCH with alpha", () => {
      const result = parseOklch("oklch(0.6 0.2 250 / 50%)");
      expect(result).not.toBeNull();
      expect(result?.alpha).toBeCloseTo(0.5, 2);
    });

    it("returns null for empty string", () => {
      expect(parseOklch("")).toBeNull();
    });

    it("returns null for non-oklch string", () => {
      expect(parseOklch("rgb(255, 0, 0)")).toBeNull();
    });

    it("returns null for invalid oklch format", () => {
      expect(parseOklch("oklch(invalid)")).toBeNull();
    });

    it("returns null for null input", () => {
      expect(parseOklch(null as unknown as string)).toBeNull();
    });
  });

  describe("oklchToHex", () => {
    it("converts OKLCH to HEX", () => {
      const hex = oklchToHex("oklch(0.6 0.2 250)");
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it("returns null for empty string", () => {
      expect(oklchToHex("")).toBeNull();
    });

    it("returns null for invalid OKLCH", () => {
      expect(oklchToHex("invalid")).toBeNull();
    });

    it("handles OKLCH with zero values", () => {
      const hex = oklchToHex("oklch(0 0 0)");
      expect(hex).toBe("#000000");
    });

    it("handles OKLCH with max lightness", () => {
      const hex = oklchToHex("oklch(1 0 0)");
      expect(hex).toBe("#ffffff");
    });
  });

  describe("hexToOklch", () => {
    it("converts HEX to OKLCH with hash", () => {
      const oklch = hexToOklch("#3b82f6");
      expect(oklch).toMatch(/^oklch\([\d.]+ [\d.]+ [\d.]+\)$/);
    });

    it("converts HEX to OKLCH without hash", () => {
      const oklch = hexToOklch("3b82f6");
      expect(oklch).toMatch(/^oklch\([\d.]+ [\d.]+ [\d.]+\)$/);
    });

    it("returns null for empty string", () => {
      expect(hexToOklch("")).toBeNull();
    });

    it("returns null for invalid HEX", () => {
      expect(hexToOklch("gggggg")).toBeNull();
    });

    it("handles black color", () => {
      const oklch = hexToOklch("#000000");
      expect(oklch).toContain("oklch(0");
    });

    it("handles white color", () => {
      const oklch = hexToOklch("#ffffff");
      expect(oklch).toContain("oklch(1");
    });

    it("handles 3-character HEX", () => {
      const oklch = hexToOklch("#fff");
      expect(oklch).not.toBeNull();
    });
  });

  describe("formatOklchString", () => {
    it("formats components without alpha", () => {
      const components: OklchComponents = { l: 0.6, c: 0.2, h: 250 };
      expect(formatOklchString(components)).toBe("oklch(0.6 0.2 250)");
    });

    it("formats components with alpha", () => {
      const components: OklchComponents = { l: 0.6, c: 0.2, h: 250, alpha: 0.5 };
      expect(formatOklchString(components)).toBe("oklch(0.6 0.2 250 / 50%)");
    });

    it("formats components with full alpha (ignores)", () => {
      const components: OklchComponents = { l: 0.6, c: 0.2, h: 250, alpha: 1 };
      expect(formatOklchString(components)).toBe("oklch(0.6 0.2 250)");
    });

    it("rounds values to 3 decimal places", () => {
      const components: OklchComponents = { l: 0.66666, c: 0.22222, h: 250.5555 };
      const result = formatOklchString(components);
      expect(result).toBe("oklch(0.667 0.222 250.556)");
    });
  });

  describe("isValidHex", () => {
    it("validates 6-character HEX with hash", () => {
      expect(isValidHex("#3b82f6")).toBe(true);
    });

    it("validates 6-character HEX without hash", () => {
      expect(isValidHex("3b82f6")).toBe(true);
    });

    it("validates 3-character HEX", () => {
      expect(isValidHex("#fff")).toBe(true);
    });

    it("validates 8-character HEX (with alpha)", () => {
      expect(isValidHex("#3b82f680")).toBe(true);
    });

    it("rejects empty string", () => {
      expect(isValidHex("")).toBe(false);
    });

    it("rejects invalid characters", () => {
      expect(isValidHex("#gggggg")).toBe(false);
    });

    it("rejects wrong length", () => {
      expect(isValidHex("#3b82")).toBe(false);
    });
  });

  describe("isValidOklch", () => {
    it("validates correct OKLCH string", () => {
      expect(isValidOklch("oklch(0.6 0.2 250)")).toBe(true);
    });

    it("rejects empty string", () => {
      expect(isValidOklch("")).toBe(false);
    });

    it("rejects non-oklch prefix", () => {
      expect(isValidOklch("rgb(255, 0, 0)")).toBe(false);
    });

    it("rejects invalid oklch values", () => {
      expect(isValidOklch("oklch(invalid)")).toBe(false);
    });
  });
});
