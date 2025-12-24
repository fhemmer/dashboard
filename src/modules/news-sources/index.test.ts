import { describe, expect, it } from "vitest";
import * as newsSourcesModule from "./index";

describe("news-sources index", () => {
  it("exports actions", () => {
    expect(newsSourcesModule.canManageNewsSources).toBeDefined();
    expect(newsSourcesModule.createNewsSource).toBeDefined();
    expect(newsSourcesModule.deleteNewsSource).toBeDefined();
    expect(newsSourcesModule.getCurrentUserRole).toBeDefined();
    expect(newsSourcesModule.getNewsSources).toBeDefined();
    expect(newsSourcesModule.getSystemSetting).toBeDefined();
    expect(newsSourcesModule.getSystemSettings).toBeDefined();
    expect(newsSourcesModule.toggleNewsSourceActive).toBeDefined();
    expect(newsSourcesModule.updateNewsSource).toBeDefined();
    expect(newsSourcesModule.updateSystemSetting).toBeDefined();
  });

  it("exports components", () => {
    expect(newsSourcesModule.AdminSettingsForm).toBeDefined();
    expect(newsSourcesModule.CategoryBadge).toBeDefined();
    expect(newsSourcesModule.SourceForm).toBeDefined();
    expect(newsSourcesModule.SourceList).toBeDefined();
  });

  it("exports types and constants", () => {
    expect(newsSourcesModule.BRAND_COLORS).toBeDefined();
    expect(newsSourcesModule.SOURCE_ICONS).toBeDefined();
    expect(newsSourcesModule.getBrandColorClass).toBeDefined();
    expect(newsSourcesModule.getCategoryColorClass).toBeDefined();
    expect(newsSourcesModule.getCategoryLabel).toBeDefined();
    expect(newsSourcesModule.toNewsSource).toBeDefined();
  });

  it("BRAND_COLORS is an array", () => {
    expect(Array.isArray(newsSourcesModule.BRAND_COLORS)).toBe(true);
    expect(newsSourcesModule.BRAND_COLORS.length).toBeGreaterThan(0);
  });

  it("SOURCE_ICONS is an array", () => {
    expect(Array.isArray(newsSourcesModule.SOURCE_ICONS)).toBe(true);
    expect(newsSourcesModule.SOURCE_ICONS.length).toBeGreaterThan(0);
  });
});
