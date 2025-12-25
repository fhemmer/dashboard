import * as dashboardActions from "@/app/actions.dashboard";
import type { WidgetId, WidgetSettings } from "@/lib/widgets";
import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardGrid } from "./dashboard-grid";

// Mock the server actions
vi.mock("@/app/actions.dashboard", () => ({
  updateWidgetOrder: vi.fn().mockResolvedValue({}),
}));

// Store DndContext event handlers for testing
let onDragStartHandler: ((event: { active: { id: string } }) => void) | null =
  null;
let onDragEndHandler:
  | ((event: { active: { id: string }; over: { id: string } | null }) => void)
  | null = null;
let onDragCancelHandler: (() => void) | null = null;

// Mock @dnd-kit to capture handlers
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({
    children,
    onDragStart,
    onDragEnd,
    onDragCancel,
  }: {
    children: React.ReactNode;
    onDragStart?: (event: { active: { id: string } }) => void;
    onDragEnd?: (event: {
      active: { id: string };
      over: { id: string } | null;
    }) => void;
    onDragCancel?: () => void;
  }) => {
    onDragStartHandler = onDragStart ?? null;
    onDragEndHandler = onDragEnd ?? null;
    onDragCancelHandler = onDragCancel ?? null;
    return <div data-testid="dnd-context">{children}</div>;
  },
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn().mockReturnValue([]),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sortable-context">{children}</div>
  ),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  rectSortingStrategy: {},
  arrayMove: <T,>(arr: T[], from: number, to: number): T[] => {
    const result = [...arr];
    const [removed] = result.splice(from, 1);
    result.splice(to, 0, removed);
    return result;
  },
}));

const mockSettings: WidgetSettings = {
  widgets: [
    { id: "pull-requests", enabled: true, order: 0 },
    { id: "news", enabled: true, order: 1 },
    { id: "expenditures", enabled: false, order: 2 },
    { id: "mail", enabled: false, order: 3 },
  ],
};

const mockWidgetComponents: Record<WidgetId, ReactNode> = {
  "pull-requests": <div data-testid="pr-widget">PR Widget</div>,
  news: <div data-testid="news-widget">News Widget</div>,
  expenditures: (
    <div data-testid="expenditures-widget">Expenditures Widget</div>
  ),
  timers: <div data-testid="timers-widget">Timers Widget</div>,
  mail: <div data-testid="mail-widget">Mail Widget</div>,
};

describe("DashboardGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dashboardActions.updateWidgetOrder).mockResolvedValue({});
    onDragStartHandler = null;
    onDragEndHandler = null;
    onDragCancelHandler = null;
  });

  it("renders enabled widgets only", () => {
    render(
      <DashboardGrid
        settings={mockSettings}
        widgetComponents={mockWidgetComponents}
      />
    );

    expect(screen.getByTestId("pr-widget")).toBeDefined();
    expect(screen.getByTestId("news-widget")).toBeDefined();
    expect(screen.queryByTestId("expenditures-widget")).toBeNull();
  });

  it("renders widgets in order", () => {
    const reorderedSettings: WidgetSettings = {
      widgets: [
        { id: "pull-requests", enabled: true, order: 1 },
        { id: "news", enabled: true, order: 0 },
      ],
    };

    render(
      <DashboardGrid
        settings={reorderedSettings}
        widgetComponents={mockWidgetComponents}
      />
    );

    const widgets = screen.getAllByTestId(/widget/);
    expect(widgets[0]).toHaveTextContent("News Widget");
    expect(widgets[1]).toHaveTextContent("PR Widget");
  });

  it("shows empty state when no widgets enabled", () => {
    const noWidgetsSettings: WidgetSettings = {
      widgets: [
        { id: "pull-requests", enabled: false, order: 0 },
        { id: "news", enabled: false, order: 1 },
      ],
    };

    render(
      <DashboardGrid
        settings={noWidgetsSettings}
        widgetComponents={mockWidgetComponents}
      />
    );

    expect(screen.getByText("No widgets enabled")).toBeDefined();
    expect(screen.getByText(/Click the Configure button above/)).toBeDefined();
  });

  it("handles missing widget components gracefully", () => {
    const partialComponents: Record<WidgetId, ReactNode> = {
      "pull-requests": <div data-testid="pr-widget">PR Widget</div>,
      news: null,
      expenditures: null,
      timers: null,
      mail: null,
    };

    const settings: WidgetSettings = {
      widgets: [
        { id: "pull-requests", enabled: true, order: 0 },
        { id: "news", enabled: true, order: 1 },
      ],
    };

    render(
      <DashboardGrid settings={settings} widgetComponents={partialComponents} />
    );

    expect(screen.getByTestId("pr-widget")).toBeDefined();
  });

  it("renders DndContext wrapper", () => {
    render(
      <DashboardGrid
        settings={mockSettings}
        widgetComponents={mockWidgetComponents}
      />
    );

    expect(screen.getByTestId("dnd-context")).toBeDefined();
  });

  it("renders empty state with icon", () => {
    const noWidgetsSettings: WidgetSettings = {
      widgets: [{ id: "pull-requests", enabled: false, order: 0 }],
    };

    render(
      <DashboardGrid
        settings={noWidgetsSettings}
        widgetComponents={mockWidgetComponents}
      />
    );

    // Check for SVG icon in empty state
    const svg = document.querySelector("svg");
    expect(svg).toBeDefined();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
  });

  it("handles all widgets enabled", () => {
    const allEnabledSettings: WidgetSettings = {
      widgets: [
        { id: "pull-requests", enabled: true, order: 0 },
        { id: "news", enabled: true, order: 1 },
        { id: "expenditures", enabled: true, order: 2 },
      ],
    };

    render(
      <DashboardGrid
        settings={allEnabledSettings}
        widgetComponents={mockWidgetComponents}
      />
    );

    expect(screen.getByTestId("pr-widget")).toBeDefined();
    expect(screen.getByTestId("news-widget")).toBeDefined();
    expect(screen.getByTestId("expenditures-widget")).toBeDefined();
  });

  it("handles single widget enabled", () => {
    const singleWidgetSettings: WidgetSettings = {
      widgets: [
        { id: "pull-requests", enabled: true, order: 0 },
        { id: "news", enabled: false, order: 1 },
        { id: "expenditures", enabled: false, order: 2 },
      ],
    };

    render(
      <DashboardGrid
        settings={singleWidgetSettings}
        widgetComponents={mockWidgetComponents}
      />
    );

    expect(screen.getByTestId("pr-widget")).toBeDefined();
    expect(screen.queryByTestId("news-widget")).toBeNull();
    expect(screen.queryByTestId("expenditures-widget")).toBeNull();
  });

  it("handles empty widgets array", () => {
    const emptySettings: WidgetSettings = {
      widgets: [],
    };

    render(
      <DashboardGrid
        settings={emptySettings}
        widgetComponents={mockWidgetComponents}
      />
    );

    expect(screen.getByText("No widgets enabled")).toBeDefined();
  });

  it("calls updateWidgetOrder when drag ends with reorder", async () => {
    render(
      <DashboardGrid
        settings={mockSettings}
        widgetComponents={mockWidgetComponents}
      />
    );

    // Simulate drag end with a valid reorder
    await act(async () => {
      onDragEndHandler?.({
        active: { id: "pull-requests" },
        over: { id: "news" },
      });
    });

    await waitFor(() => {
      expect(dashboardActions.updateWidgetOrder).toHaveBeenCalled();
    });
  });

  it("does not call updateWidgetOrder when drag ends on same item", async () => {
    render(
      <DashboardGrid
        settings={mockSettings}
        widgetComponents={mockWidgetComponents}
      />
    );

    // Simulate drag end on same item (no reorder)
    await act(async () => {
      onDragEndHandler?.({
        active: { id: "pull-requests" },
        over: { id: "pull-requests" },
      });
    });

    expect(dashboardActions.updateWidgetOrder).not.toHaveBeenCalled();
  });

  it("does not call updateWidgetOrder when drag ends with no over target", async () => {
    render(
      <DashboardGrid
        settings={mockSettings}
        widgetComponents={mockWidgetComponents}
      />
    );

    // Simulate drag end with no over target
    await act(async () => {
      onDragEndHandler?.({
        active: { id: "pull-requests" },
        over: null,
      });
    });

    expect(dashboardActions.updateWidgetOrder).not.toHaveBeenCalled();
  });

  it("handles drag start event", async () => {
    render(
      <DashboardGrid
        settings={mockSettings}
        widgetComponents={mockWidgetComponents}
      />
    );

    // Simulate drag start
    await act(async () => {
      onDragStartHandler?.({ active: { id: "pull-requests" } });
    });

    // Component should still render properly
    expect(screen.getByTestId("pr-widget")).toBeDefined();
  });

  it("handles drag cancel event", async () => {
    render(
      <DashboardGrid
        settings={mockSettings}
        widgetComponents={mockWidgetComponents}
      />
    );

    // Simulate drag cancel
    await act(async () => {
      onDragCancelHandler?.();
    });

    // Component should still render properly
    expect(screen.getByTestId("pr-widget")).toBeDefined();
  });

  it("reverts order on server error", async () => {
    vi.mocked(dashboardActions.updateWidgetOrder).mockResolvedValue({
      error: "Server error",
    });

    render(
      <DashboardGrid
        settings={mockSettings}
        widgetComponents={mockWidgetComponents}
      />
    );

    // Simulate drag end with a valid reorder
    await act(async () => {
      onDragEndHandler?.({
        active: { id: "pull-requests" },
        over: { id: "news" },
      });
    });

    await waitFor(() => {
      expect(dashboardActions.updateWidgetOrder).toHaveBeenCalled();
    });

    // Wait for the revert to happen
    await waitFor(() => {
      // Widgets should still render in original order
      const widgets = screen.getAllByTestId(/widget/);
      expect(widgets[0]).toHaveTextContent("PR Widget");
      expect(widgets[1]).toHaveTextContent("News Widget");
    });
  });

  it("includes disabled widgets in full order update", async () => {
    render(
      <DashboardGrid
        settings={mockSettings}
        widgetComponents={mockWidgetComponents}
      />
    );

    // Simulate drag end with a valid reorder
    await act(async () => {
      onDragEndHandler?.({
        active: { id: "pull-requests" },
        over: { id: "news" },
      });
    });

    await waitFor(() => {
      // Check that the full order includes disabled widgets
      expect(dashboardActions.updateWidgetOrder).toHaveBeenCalledWith(
        expect.arrayContaining(["expenditures"])
      );
    });
  });

  it("syncs local state when settings prop changes", () => {
    const { rerender } = render(
      <DashboardGrid
        settings={mockSettings}
        widgetComponents={mockWidgetComponents}
      />
    );

    // Initially PR and News widgets are visible
    expect(screen.getByTestId("pr-widget")).toBeDefined();
    expect(screen.getByTestId("news-widget")).toBeDefined();
    expect(screen.queryByTestId("expenditures-widget")).toBeNull();

    // Simulate props changing (e.g., after router.refresh())
    const updatedSettings: WidgetSettings = {
      widgets: [
        { id: "pull-requests", enabled: false, order: 0 },
        { id: "news", enabled: true, order: 1 },
        { id: "expenditures", enabled: true, order: 2 },
      ],
    };

    rerender(
      <DashboardGrid
        settings={updatedSettings}
        widgetComponents={mockWidgetComponents}
      />
    );

    // Now only News and Expenditures should be visible
    expect(screen.queryByTestId("pr-widget")).toBeNull();
    expect(screen.getByTestId("news-widget")).toBeDefined();
    expect(screen.getByTestId("expenditures-widget")).toBeDefined();
  });
});
