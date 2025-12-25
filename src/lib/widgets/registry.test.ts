import { describe, expect, it } from "vitest";
import { getAllWidgets, getAvailableWidgets, getWidgetById, WIDGET_REGISTRY } from "./registry";

describe("WIDGET_REGISTRY", () => {
  it("contains all expected widgets", () => {
    expect(WIDGET_REGISTRY["pull-requests"]).toBeDefined();
    expect(WIDGET_REGISTRY["news"]).toBeDefined();
    expect(WIDGET_REGISTRY["expenditures"]).toBeDefined();
    expect(WIDGET_REGISTRY["timers"]).toBeDefined();
    expect(WIDGET_REGISTRY["mail"]).toBeDefined();
  });

  it("has correct structure for each widget", () => {
    for (const widget of Object.values(WIDGET_REGISTRY)) {
      expect(widget.id).toBeDefined();
      expect(widget.name).toBeDefined();
      expect(widget.description).toBeDefined();
      expect(widget.icon).toBeDefined();
      expect(typeof widget.defaultEnabled).toBe("boolean");
    }
  });

  it("marks expenditures as admin-only", () => {
    expect(WIDGET_REGISTRY["expenditures"].requiresAdmin).toBe(true);
  });

  it("does not mark other widgets as admin-only", () => {
    expect(WIDGET_REGISTRY["pull-requests"].requiresAdmin).toBeUndefined();
    expect(WIDGET_REGISTRY["news"].requiresAdmin).toBeUndefined();
    expect(WIDGET_REGISTRY["timers"].requiresAdmin).toBeUndefined();
    expect(WIDGET_REGISTRY["mail"].requiresAdmin).toBeUndefined();
  });
});

describe("getAllWidgets", () => {
  it("returns all widgets as an array", () => {
    const widgets = getAllWidgets();
    expect(widgets).toHaveLength(5);
    expect(widgets.map((w) => w.id)).toContain("pull-requests");
    expect(widgets.map((w) => w.id)).toContain("news");
    expect(widgets.map((w) => w.id)).toContain("expenditures");
    expect(widgets.map((w) => w.id)).toContain("timers");
    expect(widgets.map((w) => w.id)).toContain("mail");
  });
});

describe("getAvailableWidgets", () => {
  it("returns all widgets for admin users", () => {
    const widgets = getAvailableWidgets(true);
    expect(widgets).toHaveLength(5);
    expect(widgets.map((w) => w.id)).toContain("expenditures");
    expect(widgets.map((w) => w.id)).toContain("mail");
  });

  it("excludes admin-only widgets for non-admin users", () => {
    const widgets = getAvailableWidgets(false);
    expect(widgets).toHaveLength(4);
    expect(widgets.map((w) => w.id)).not.toContain("expenditures");
    expect(widgets.map((w) => w.id)).toContain("mail");
  });
});

describe("getWidgetById", () => {
  it("returns the correct widget by ID", () => {
    const widget = getWidgetById("pull-requests");
    expect(widget?.id).toBe("pull-requests");
    expect(widget?.name).toBe("Pull Requests");
  });

  it("returns undefined for non-existent widget ID", () => {
    // @ts-expect-error Testing invalid ID
    const widget = getWidgetById("non-existent");
    expect(widget).toBeUndefined();
  });
});
