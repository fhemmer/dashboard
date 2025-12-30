import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyThemeVariables,
  clearCustomThemeVariables,
  createEmptyThemeVariables,
  extractCurrentThemeVariables,
  extractThemeVariablesWithHex,
  parseThemeVariablesFromJson,
  THEME_VARIABLE_GROUPS,
  THEME_VARIABLE_LABELS,
  THEME_VARIABLE_NAMES,
  type ThemeVariables,
} from "./theme-utils";

// Mock document and window for Node environment
const mockGetComputedStyle = vi.fn();
const mockSetProperty = vi.fn();
const mockRemoveProperty = vi.fn();

describe("theme-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock document.documentElement
    Object.defineProperty(global, "document", {
      value: {
        documentElement: {
          style: {
            setProperty: mockSetProperty,
            removeProperty: mockRemoveProperty,
          },
        },
      },
      writable: true,
    });

    // Mock getComputedStyle
    Object.defineProperty(global, "getComputedStyle", {
      value: mockGetComputedStyle,
      writable: true,
    });
  });

  describe("constants", () => {
    it("has 31 theme variable names", () => {
      expect(THEME_VARIABLE_NAMES).toHaveLength(31);
    });

    it("has groups covering all variables", () => {
      const allGroupVars = [
        ...THEME_VARIABLE_GROUPS.core,
        ...THEME_VARIABLE_GROUPS.components,
        ...THEME_VARIABLE_GROUPS.sidebar,
        ...THEME_VARIABLE_GROUPS.charts,
      ];
      expect(allGroupVars).toHaveLength(31);
    });

    it("has labels for all variables", () => {
      for (const name of THEME_VARIABLE_NAMES) {
        expect(THEME_VARIABLE_LABELS[name]).toBeDefined();
        expect(typeof THEME_VARIABLE_LABELS[name]).toBe("string");
      }
    });
  });

  describe("extractCurrentThemeVariables", () => {
    it("extracts variables from computed styles", () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: (prop: string) => {
          if (prop === "--background") return "oklch(0.98 0 0)";
          if (prop === "--foreground") return "oklch(0.1 0 0)";
          return "";
        },
      });

      const vars = extractCurrentThemeVariables();

      expect(vars.background).toBe("oklch(0.98 0 0)");
      expect(vars.foreground).toBe("oklch(0.1 0 0)");
    });

    it("uses default for missing variables", () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: () => "",
      });

      const vars = extractCurrentThemeVariables();

      expect(vars.background).toBe("oklch(0 0 0)");
    });

    it("returns empty variables when document is undefined", () => {
      const originalDocument = global.document;
      // @ts-expect-error - Intentionally removing document
      delete global.document;

      const vars = extractCurrentThemeVariables();

      expect(vars.background).toBe("oklch(0.5 0 0)");

      global.document = originalDocument;
    });
  });

  describe("extractThemeVariablesWithHex", () => {
    it("returns variables with hex conversions", () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: (prop: string) => {
          if (prop === "--background") return "oklch(1 0 0)";
          return "oklch(0.5 0 0)";
        },
      });

      const vars = extractThemeVariablesWithHex();

      expect(vars.background.oklch).toBe("oklch(1 0 0)");
      expect(vars.background.hex).toBe("#ffffff");
    });

    it("uses fallback hex for invalid oklch", () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: () => "invalid",
      });

      const vars = extractThemeVariablesWithHex();

      expect(vars.background.hex).toBe("#000000");
    });
  });

  describe("createEmptyThemeVariables", () => {
    it("creates variables with default values", () => {
      const vars = createEmptyThemeVariables();

      expect(vars.background).toBe("oklch(0.5 0 0)");
      expect(vars.foreground).toBe("oklch(0.5 0 0)");
    });

    it("includes all variable names", () => {
      const vars = createEmptyThemeVariables();

      for (const name of THEME_VARIABLE_NAMES) {
        expect(vars[name]).toBeDefined();
      }
    });
  });

  describe("applyThemeVariables", () => {
    it("sets CSS properties on documentElement", () => {
      const vars: Partial<ThemeVariables> = {
        background: "oklch(0.98 0 0)",
        foreground: "oklch(0.1 0 0)",
      };

      applyThemeVariables(vars as ThemeVariables);

      expect(mockSetProperty).toHaveBeenCalledWith("--background", "oklch(0.98 0 0)");
      expect(mockSetProperty).toHaveBeenCalledWith("--foreground", "oklch(0.1 0 0)");
    });

    it("does nothing when document is undefined", () => {
      const originalDocument = global.document;
      // @ts-expect-error - Intentionally removing document
      delete global.document;

      const vars = createEmptyThemeVariables();
      applyThemeVariables(vars);

      expect(mockSetProperty).not.toHaveBeenCalled();

      global.document = originalDocument;
    });
  });

  describe("clearCustomThemeVariables", () => {
    it("removes CSS properties from documentElement", () => {
      clearCustomThemeVariables();

      expect(mockRemoveProperty).toHaveBeenCalledWith("--background");
      expect(mockRemoveProperty).toHaveBeenCalledWith("--foreground");
      expect(mockRemoveProperty).toHaveBeenCalledTimes(31);
    });

    it("does nothing when document is undefined", () => {
      const originalDocument = global.document;
      // @ts-expect-error - Intentionally removing document
      delete global.document;

      clearCustomThemeVariables();

      expect(mockRemoveProperty).not.toHaveBeenCalled();

      global.document = originalDocument;
    });
  });

  describe("parseThemeVariablesFromJson", () => {
    it("parses valid JSON object", () => {
      const json = {
        background: "oklch(0.98 0 0)",
        foreground: "oklch(0.1 0 0)",
      };

      const vars = parseThemeVariablesFromJson(json);

      expect(vars.background).toBe("oklch(0.98 0 0)");
      expect(vars.foreground).toBe("oklch(0.1 0 0)");
    });

    it("uses default for missing keys", () => {
      const vars = parseThemeVariablesFromJson({});

      expect(vars.background).toBe("oklch(0.5 0 0)");
    });

    it("uses default for non-string values", () => {
      const json = {
        background: 123,
        foreground: null,
      };

      const vars = parseThemeVariablesFromJson(json as unknown as Record<string, unknown>);

      expect(vars.background).toBe("oklch(0.5 0 0)");
      expect(vars.foreground).toBe("oklch(0.5 0 0)");
    });
  });
});
