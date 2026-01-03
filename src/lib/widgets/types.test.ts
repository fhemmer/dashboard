import { GitPullRequest, Newspaper, Wallet } from "lucide-react";
import { describe, expect, it } from "vitest";
import {
    getDefaultWidgetSettings,
    getEnabledWidgets,
    mergeWidgetSettings,
    reorderWidgets,
    resolveWidgetSize,
    toggleWidget,
    updateLayoutMode,
    updateWidgetSize,
    type WidgetDefinition,
    type WidgetId,
    type WidgetSettings,
} from "./types";

const mockWidgets: WidgetDefinition[] = [
  {
    id: "pull-requests",
    name: "Pull Requests",
    description: "GitHub PRs",
    icon: GitPullRequest,
    defaultEnabled: true,
    defaultColspan: 1,
    defaultRowspan: 2,
  },
  {
    id: "news",
    name: "News",
    description: "Latest news",
    icon: Newspaper,
    defaultEnabled: true,
    defaultColspan: 1,
    defaultRowspan: 2,
  },
  {
    id: "expenditures",
    name: "Expenditures",
    description: "Track costs",
    icon: Wallet,
    requiresAdmin: true,
    defaultEnabled: true,
    defaultColspan: 2,
    defaultRowspan: 1,
  },
];

describe("getDefaultWidgetSettings", () => {
  it("creates settings with all widgets enabled in order", () => {
    const result = getDefaultWidgetSettings(mockWidgets);

    expect(result.widgets).toHaveLength(3);
    expect(result.widgets[0]).toEqual({
      id: "pull-requests",
      enabled: true,
      order: 0,
    });
    expect(result.widgets[1]).toEqual({
      id: "news",
      enabled: true,
      order: 1,
    });
    expect(result.widgets[2]).toEqual({
      id: "expenditures",
      enabled: true,
      order: 2,
    });
  });

  it("handles empty widget list", () => {
    const result = getDefaultWidgetSettings([]);
    expect(result.widgets).toHaveLength(0);
  });
});

describe("mergeWidgetSettings", () => {
  it("returns defaults when user settings is null", () => {
    const result = mergeWidgetSettings(null, mockWidgets);

    expect(result.widgets).toHaveLength(3);
    expect(result.widgets.every((w) => w.enabled)).toBe(true);
  });

  it("preserves user settings and adds new widgets", () => {
    const userSettings: WidgetSettings = {
      widgets: [
        { id: "pull-requests", enabled: false, order: 1 },
        { id: "news", enabled: true, order: 0 },
      ],
    };

    const result = mergeWidgetSettings(userSettings, mockWidgets);

    expect(result.widgets).toHaveLength(3);
    // Existing widgets keep their settings
    const prWidget = result.widgets.find((w) => w.id === "pull-requests");
    expect(prWidget?.enabled).toBe(false);
    expect(prWidget?.order).toBe(1);

    // New widget added with default settings
    const expendWidget = result.widgets.find((w) => w.id === "expenditures");
    expect(expendWidget?.enabled).toBe(true);
    expect(expendWidget?.order).toBe(2); // Added at the end
  });

  it("removes widgets that no longer exist in registry", () => {
    const userSettings: WidgetSettings = {
      widgets: [
        { id: "pull-requests", enabled: true, order: 0 },
        { id: "old-widget" as WidgetId, enabled: true, order: 1 },
      ],
    };

    const limitedWidgets = [mockWidgets[0]]; // Only pull-requests
    const result = mergeWidgetSettings(userSettings, limitedWidgets);

    expect(result.widgets).toHaveLength(1);
    expect(result.widgets[0].id).toBe("pull-requests");
  });

  it("sorts merged widgets by order", () => {
    const userSettings: WidgetSettings = {
      widgets: [
        { id: "news", enabled: true, order: 2 },
        { id: "pull-requests", enabled: true, order: 0 },
      ],
    };

    const result = mergeWidgetSettings(userSettings, mockWidgets.slice(0, 2));

    expect(result.widgets[0].id).toBe("pull-requests");
    expect(result.widgets[1].id).toBe("news");
  });
});

describe("getEnabledWidgets", () => {
  it("returns only enabled widgets sorted by order", () => {
    const settings: WidgetSettings = {
      widgets: [
        { id: "pull-requests", enabled: false, order: 0 },
        { id: "news", enabled: true, order: 2 },
        { id: "expenditures", enabled: true, order: 1 },
      ],
    };

    const result = getEnabledWidgets(settings);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("expenditures");
    expect(result[1].id).toBe("news");
  });

  it("returns empty array when no widgets enabled", () => {
    const settings: WidgetSettings = {
      widgets: [
        { id: "pull-requests", enabled: false, order: 0 },
        { id: "news", enabled: false, order: 1 },
      ],
    };

    expect(getEnabledWidgets(settings)).toHaveLength(0);
  });
});

describe("toggleWidget", () => {
  it("toggles a widget enabled state", () => {
    const settings: WidgetSettings = {
      widgets: [
        { id: "pull-requests", enabled: true, order: 0 },
        { id: "news", enabled: true, order: 1 },
      ],
    };

    const result = toggleWidget(settings, "pull-requests", false);

    expect(result.widgets[0].enabled).toBe(false);
    expect(result.widgets[1].enabled).toBe(true);
  });

  it("leaves other widgets unchanged", () => {
    const settings: WidgetSettings = {
      widgets: [
        { id: "pull-requests", enabled: true, order: 0 },
        { id: "news", enabled: false, order: 1 },
      ],
    };

    const result = toggleWidget(settings, "news", true);

    expect(result.widgets[0].enabled).toBe(true);
    expect(result.widgets[1].enabled).toBe(true);
  });
});

describe("reorderWidgets", () => {
  it("updates widget order based on new order array", () => {
    const settings: WidgetSettings = {
      widgets: [
        { id: "pull-requests", enabled: true, order: 0 },
        { id: "news", enabled: true, order: 1 },
        { id: "expenditures", enabled: true, order: 2 },
      ],
    };

    const newOrder: WidgetId[] = ["news", "expenditures", "pull-requests"];
    const result = reorderWidgets(settings, newOrder);

    expect(result.widgets.find((w) => w.id === "news")?.order).toBe(0);
    expect(result.widgets.find((w) => w.id === "expenditures")?.order).toBe(1);
    expect(result.widgets.find((w) => w.id === "pull-requests")?.order).toBe(2);
  });

  it("preserves original order for widgets not in new order array", () => {
    const settings: WidgetSettings = {
      widgets: [
        { id: "pull-requests", enabled: true, order: 0 },
        { id: "news", enabled: true, order: 1 },
        { id: "expenditures", enabled: true, order: 2 },
      ],
    };

    const partialOrder: WidgetId[] = ["news", "pull-requests"];
    const result = reorderWidgets(settings, partialOrder);

    expect(result.widgets.find((w) => w.id === "expenditures")?.order).toBe(2);
  });

  it("preserves layoutMode when reordering", () => {
    const settings: WidgetSettings = {
      layoutMode: "auto",
      widgets: [
        { id: "pull-requests", enabled: true, order: 0 },
        { id: "news", enabled: true, order: 1 },
      ],
    };

    const newOrder: WidgetId[] = ["news", "pull-requests"];
    const result = reorderWidgets(settings, newOrder);

    expect(result.layoutMode).toBe("auto");
  });
});

describe("resolveWidgetSize", () => {
  it("uses user settings when provided", () => {
    const setting = { id: "pull-requests" as WidgetId, enabled: true, order: 0, colspan: 2 as const, rowspan: 3 as const };
    const result = resolveWidgetSize(setting, mockWidgets[0]);

    expect(result.colspan).toBe(2);
    expect(result.rowspan).toBe(3);
  });

  it("falls back to registry defaults when user settings not provided", () => {
    const setting = { id: "pull-requests" as WidgetId, enabled: true, order: 0 };
    const result = resolveWidgetSize(setting, mockWidgets[0]);

    expect(result.colspan).toBe(1); // defaultColspan from mockWidgets[0]
    expect(result.rowspan).toBe(2); // defaultRowspan from mockWidgets[0]
  });

  it("falls back to 1x1 when no defaults exist", () => {
    const setting = { id: "pull-requests" as WidgetId, enabled: true, order: 0 };
    const widgetWithoutDefaults: WidgetDefinition = {
      id: "pull-requests",
      name: "Pull Requests",
      description: "GitHub PRs",
      icon: GitPullRequest,
      defaultEnabled: true,
    };
    const result = resolveWidgetSize(setting, widgetWithoutDefaults);

    expect(result.colspan).toBe(1);
    expect(result.rowspan).toBe(1);
  });

  it("includes all original setting properties", () => {
    const setting = { id: "news" as WidgetId, enabled: false, order: 5 };
    const result = resolveWidgetSize(setting, mockWidgets[1]);

    expect(result.id).toBe("news");
    expect(result.enabled).toBe(false);
    expect(result.order).toBe(5);
  });

  it("handles undefined definition gracefully", () => {
    const setting = { id: "unknown-widget" as WidgetId, enabled: true, order: 0 };
    const result = resolveWidgetSize(setting, undefined);

    expect(result.colspan).toBe(1);
    expect(result.rowspan).toBe(1);
  });
});

describe("updateWidgetSize", () => {
  it("updates the size of a specific widget", () => {
    const settings: WidgetSettings = {
      widgets: [
        { id: "pull-requests", enabled: true, order: 0, colspan: 1, rowspan: 1 },
        { id: "news", enabled: true, order: 1 },
      ],
    };

    const result = updateWidgetSize(settings, "pull-requests", 2, 3);

    const prWidget = result.widgets.find((w) => w.id === "pull-requests");
    expect(prWidget?.colspan).toBe(2);
    expect(prWidget?.rowspan).toBe(3);
  });

  it("leaves other widgets unchanged", () => {
    const settings: WidgetSettings = {
      widgets: [
        { id: "pull-requests", enabled: true, order: 0, colspan: 1, rowspan: 1 },
        { id: "news", enabled: true, order: 1, colspan: 2, rowspan: 2 },
      ],
    };

    const result = updateWidgetSize(settings, "pull-requests", 2, 3);

    const newsWidget = result.widgets.find((w) => w.id === "news");
    expect(newsWidget?.colspan).toBe(2);
    expect(newsWidget?.rowspan).toBe(2);
  });

  it("preserves layoutMode", () => {
    const settings: WidgetSettings = {
      layoutMode: "auto",
      widgets: [
        { id: "pull-requests", enabled: true, order: 0 },
      ],
    };

    const result = updateWidgetSize(settings, "pull-requests", 2, 2);

    expect(result.layoutMode).toBe("auto");
  });
});

describe("updateLayoutMode", () => {
  it("sets layout mode to auto", () => {
    const settings: WidgetSettings = {
      widgets: [
        { id: "pull-requests", enabled: true, order: 0 },
      ],
    };

    const result = updateLayoutMode(settings, "auto");

    expect(result.layoutMode).toBe("auto");
  });

  it("sets layout mode to manual", () => {
    const settings: WidgetSettings = {
      layoutMode: "auto",
      widgets: [
        { id: "pull-requests", enabled: true, order: 0 },
      ],
    };

    const result = updateLayoutMode(settings, "manual");

    expect(result.layoutMode).toBe("manual");
  });

  it("preserves widgets when updating layout mode", () => {
    const settings: WidgetSettings = {
      widgets: [
        { id: "pull-requests", enabled: true, order: 0, colspan: 2, rowspan: 2 },
        { id: "news", enabled: false, order: 1 },
      ],
    };

    const result = updateLayoutMode(settings, "auto");

    expect(result.widgets).toHaveLength(2);
    expect(result.widgets[0].colspan).toBe(2);
    expect(result.widgets[0].rowspan).toBe(2);
    expect(result.widgets[1].enabled).toBe(false);
  });
});

describe("mergeWidgetSettings with layoutMode", () => {
  it("preserves layoutMode from user settings", () => {
    const userSettings: WidgetSettings = {
      layoutMode: "auto",
      widgets: [
        { id: "pull-requests", enabled: true, order: 0 },
      ],
    };

    const result = mergeWidgetSettings(userSettings, mockWidgets);

    expect(result.layoutMode).toBe("auto");
  });

  it("handles undefined layoutMode", () => {
    const userSettings: WidgetSettings = {
      widgets: [
        { id: "pull-requests", enabled: true, order: 0 },
      ],
    };

    const result = mergeWidgetSettings(userSettings, mockWidgets);

    expect(result.layoutMode).toBeUndefined();
  });
});

describe("toggleWidget with layoutMode", () => {
  it("preserves layoutMode when toggling widget", () => {
    const settings: WidgetSettings = {
      layoutMode: "auto",
      widgets: [
        { id: "pull-requests", enabled: true, order: 0 },
        { id: "news", enabled: true, order: 1 },
      ],
    };

    const result = toggleWidget(settings, "pull-requests", false);

    expect(result.layoutMode).toBe("auto");
  });
});
