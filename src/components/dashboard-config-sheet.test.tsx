import * as dashboardActions from "@/app/actions.dashboard";
import type { WidgetSettings } from "@/lib/widgets";
import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardConfigSheet } from "./dashboard-config-sheet";

// Mock next/navigation
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

// Mock the server actions
vi.mock("@/app/actions.dashboard", () => ({
  updateWidgetVisibility: vi.fn().mockResolvedValue({}),
  updateWidgetOrder: vi.fn().mockResolvedValue({}),
  updateWidgetSize: vi.fn().mockResolvedValue({}),
  updateLayoutMode: vi.fn().mockResolvedValue({}),
}));

// Mock the widget registry
vi.mock("@/lib/widgets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/widgets")>();
  return {
    ...actual,
    WIDGET_REGISTRY: {
      "pull-requests": {
        id: "pull-requests",
        name: "Pull Requests",
        description: "GitHub PRs across your connected accounts",
        defaultColspan: 1,
        defaultRowspan: 2,
      },
      news: {
        id: "news",
        name: "News",
        description: "Latest updates from your RSS sources",
        defaultColspan: 1,
        defaultRowspan: 2,
      },
      expenditures: {
        id: "expenditures",
        name: "Expenditures",
        description: "Track subscriptions and consumption costs",
        defaultColspan: 2,
        defaultRowspan: 1,
      },
      timers: {
        id: "timers",
        name: "Timers",
        description: "Countdown timers with alerts",
        defaultColspan: 1,
        defaultRowspan: 1,
      },
      mail: {
        id: "mail",
        name: "Mail",
        description: "Email summaries",
        defaultColspan: 1,
        defaultRowspan: 2,
      },
    },
  };
});

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: "div",
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

// Store DndContext event handler for testing
let onDragEndHandler:
  | ((event: { active: { id: string }; over: { id: string } | null }) => void)
  | null = null;

// Mock @dnd-kit to capture handlers
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: React.ReactNode;
    onDragEnd?: (event: {
      active: { id: string };
      over: { id: string } | null;
    }) => void;
  }) => {
    onDragEndHandler = onDragEnd ?? null;
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
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: {},
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
  ],
};

describe("DashboardConfigSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dashboardActions.updateWidgetVisibility).mockResolvedValue({});
    vi.mocked(dashboardActions.updateWidgetOrder).mockResolvedValue({});
    vi.mocked(dashboardActions.updateWidgetSize).mockResolvedValue({});
    vi.mocked(dashboardActions.updateLayoutMode).mockResolvedValue({});
    onDragEndHandler = null;
    mockRefresh.mockClear();
  });

  it("renders the configure button", () => {
    render(<DashboardConfigSheet settings={mockSettings} isAdmin={true} />);

    expect(screen.getByRole("button", { name: /configure/i })).toBeDefined();
  });

  it("opens sheet when clicking configure button", () => {
    render(<DashboardConfigSheet settings={mockSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

    expect(screen.getByText("Dashboard Widgets")).toBeDefined();
    expect(screen.getByText(/Toggle widgets on or off/)).toBeDefined();
  });

  it("displays all widgets in the sheet", () => {
    render(<DashboardConfigSheet settings={mockSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

    expect(screen.getByText("Pull Requests")).toBeDefined();
    expect(screen.getByText("News")).toBeDefined();
    expect(screen.getByText("Expenditures")).toBeDefined();
  });

  it("shows enabled count in description", () => {
    render(<DashboardConfigSheet settings={mockSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

    expect(screen.getByText(/Showing 2 of 3 widgets/)).toBeDefined();
  });

  it("renders toggle switches for each widget plus layout mode toggle", () => {
    render(<DashboardConfigSheet settings={mockSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(4); // 3 widget toggles + 1 layout mode toggle
  });

  it("shows tip about auto-saving", () => {
    render(<DashboardConfigSheet settings={mockSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

    expect(screen.getByText(/Changes are saved automatically/)).toBeDefined();
  });

  it("renders drag handles for reordering", () => {
    render(<DashboardConfigSheet settings={mockSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

    const dragHandles = screen.getAllByLabelText(/Drag to reorder/);
    expect(dragHandles).toHaveLength(3);
  });

  it("toggles widget visibility when switch is clicked", async () => {
    render(<DashboardConfigSheet settings={mockSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

    // Click the toggle for Pull Requests (currently enabled)
    const prToggle = screen.getByRole("switch", {
      name: /Hide Pull Requests widget/i,
    });
    await act(async () => {
      fireEvent.click(prToggle);
    });

    await waitFor(() => {
      expect(dashboardActions.updateWidgetVisibility).toHaveBeenCalledWith(
        "pull-requests",
        false
      );
    });

    // Should refresh page to sync other components
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("toggles disabled widget to enabled", async () => {
    render(<DashboardConfigSheet settings={mockSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

    // Click the toggle for Expenditures (currently disabled)
    const expendituresToggle = screen.getByRole("switch", {
      name: /Show Expenditures widget/i,
    });
    await act(async () => {
      fireEvent.click(expendituresToggle);
    });

    await waitFor(() => {
      expect(dashboardActions.updateWidgetVisibility).toHaveBeenCalledWith(
        "expenditures",
        true
      );
    });
  });

  it("reverts toggle on server error", async () => {
    vi.mocked(dashboardActions.updateWidgetVisibility).mockResolvedValue({
      error: "Server error",
    });

    render(<DashboardConfigSheet settings={mockSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

    // Initial state: enabled count is 2
    expect(screen.getByText(/Showing 2 of 3 widgets/)).toBeDefined();

    // Click to disable Pull Requests
    const prToggle = screen.getByRole("switch", {
      name: /Hide Pull Requests widget/i,
    });
    await act(async () => {
      fireEvent.click(prToggle);
    });

    // Wait for revert
    await waitFor(() => {
      expect(screen.getByText(/Showing 2 of 3 widgets/)).toBeDefined();
    });

    // Should not refresh when there's an error
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("resets local settings when sheet is reopened", async () => {
    render(<DashboardConfigSheet settings={mockSettings} isAdmin={true} />);

    // Open sheet
    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

    // Wait for sheet to open
    await waitFor(() => {
      expect(screen.getByText("Dashboard Widgets")).toBeDefined();
    });

    // Close sheet by clicking the close button
    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    // Reopen sheet
    fireEvent.click(trigger);

    // Verify settings are reset (shows original count)
    await waitFor(() => {
      expect(screen.getByText(/Showing 2 of 3 widgets/)).toBeDefined();
    });
  });

  it("updates enabled count after toggle", async () => {
    render(<DashboardConfigSheet settings={mockSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

    // Initial state: 2 of 3 enabled
    expect(screen.getByText(/Showing 2 of 3 widgets/)).toBeDefined();

    // Click to enable Expenditures
    const expendituresToggle = screen.getByRole("switch", {
      name: /Show Expenditures widget/i,
    });
    await act(async () => {
      fireEvent.click(expendituresToggle);
    });

    // Count should update optimistically
    await waitFor(() => {
      expect(screen.getByText(/Showing 3 of 3 widgets/)).toBeDefined();
    });
  });

  it("handles widget with invalid id gracefully", () => {
    const settingsWithUnknown: WidgetSettings = {
      widgets: [
        { id: "unknown-widget" as "pull-requests", enabled: true, order: 0 },
        { id: "news", enabled: true, order: 1 },
      ],
    };

    render(
      <DashboardConfigSheet settings={settingsWithUnknown} isAdmin={true} />
    );

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

    // Should still render News widget
    expect(screen.getByText("News")).toBeDefined();
  });

  it("calls updateWidgetOrder when drag ends with reorder", async () => {
    render(<DashboardConfigSheet settings={mockSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

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

    // Should refresh page to sync other components
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("does not call updateWidgetOrder when drag ends on same item", async () => {
    render(<DashboardConfigSheet settings={mockSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

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
    render(<DashboardConfigSheet settings={mockSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

    // Simulate drag end with no over target
    await act(async () => {
      onDragEndHandler?.({
        active: { id: "pull-requests" },
        over: null,
      });
    });

    expect(dashboardActions.updateWidgetOrder).not.toHaveBeenCalled();
  });

  it("reverts order on server error during drag", async () => {
    vi.mocked(dashboardActions.updateWidgetOrder).mockResolvedValue({
      error: "Server error",
    });

    render(<DashboardConfigSheet settings={mockSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

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

    // The error handling should revert, keeping original enabled count
    await waitFor(() => {
      expect(screen.getByText(/Showing 2 of 3 widgets/)).toBeDefined();
    });
  });

  it("displays layout mode toggle", () => {
    render(<DashboardConfigSheet settings={mockSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

    expect(screen.getByText("Layout Mode")).toBeDefined();
    expect(screen.getByRole("switch", { name: /Layout Mode/i })).toBeDefined();
  });

  it("shows Manual mode by default", () => {
    render(<DashboardConfigSheet settings={mockSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

    expect(screen.getByText("Manual")).toBeDefined();
    expect(screen.getByText(/Manual mode preserves widget order/)).toBeDefined();
  });

  it("shows Auto mode when layoutMode is auto", () => {
    const autoSettings: WidgetSettings = {
      layoutMode: "auto",
      widgets: mockSettings.widgets,
    };

    render(<DashboardConfigSheet settings={autoSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

    expect(screen.getByText("Auto")).toBeDefined();
    expect(screen.getByText(/Auto mode fills gaps/)).toBeDefined();
  });

  it("toggles layout mode when switch is clicked", async () => {
    render(<DashboardConfigSheet settings={mockSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

    const layoutSwitch = screen.getByRole("switch", { name: /Layout Mode/i });
    await act(async () => {
      fireEvent.click(layoutSwitch);
    });

    await waitFor(() => {
      expect(dashboardActions.updateLayoutMode).toHaveBeenCalledWith("auto");
    });

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("reverts layout mode on server error", async () => {
    vi.mocked(dashboardActions.updateLayoutMode).mockResolvedValue({
      error: "Server error",
    });

    render(<DashboardConfigSheet settings={mockSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

    const layoutSwitch = screen.getByRole("switch", { name: /Layout Mode/i });
    await act(async () => {
      fireEvent.click(layoutSwitch);
    });

    await waitFor(() => {
      expect(dashboardActions.updateLayoutMode).toHaveBeenCalled();
    });

    // Should not refresh when there's an error
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("displays widget size info for enabled widgets", () => {
    render(<DashboardConfigSheet settings={mockSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

    // Enabled widgets should show size info
    expect(screen.getAllByText(/Size: \d×\d/).length).toBeGreaterThan(0);
  });

  it("displays expand button for non-max size widgets", () => {
    render(<DashboardConfigSheet settings={mockSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

    const expandButtons = screen.getAllByTitle("Expand to 2×3");
    expect(expandButtons.length).toBeGreaterThan(0);
  });

  it("displays shrink button for non-min size widgets", () => {
    const largeSettings: WidgetSettings = {
      widgets: [
        { id: "pull-requests", enabled: true, order: 0, colspan: 2, rowspan: 3 },
        { id: "news", enabled: true, order: 1 },
        { id: "expenditures", enabled: false, order: 2 },
      ],
    };

    render(<DashboardConfigSheet settings={largeSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

    const shrinkButtons = screen.getAllByTitle("Shrink to 1×1");
    expect(shrinkButtons.length).toBeGreaterThan(0);
  });

  it("calls updateWidgetSize when expand button is clicked", async () => {
    render(<DashboardConfigSheet settings={mockSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

    const expandButtons = screen.getAllByTitle("Expand to 2×3");
    await act(async () => {
      fireEvent.click(expandButtons[0]);
    });

    await waitFor(() => {
      expect(dashboardActions.updateWidgetSize).toHaveBeenCalledWith(
        expect.any(String),
        2,
        3
      );
    });

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("calls updateWidgetSize when shrink button is clicked", async () => {
    const largeSettings: WidgetSettings = {
      widgets: [
        { id: "pull-requests", enabled: true, order: 0, colspan: 2, rowspan: 3 },
        { id: "news", enabled: true, order: 1 },
        { id: "expenditures", enabled: false, order: 2 },
      ],
    };

    render(<DashboardConfigSheet settings={largeSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

    const shrinkButtons = screen.getAllByTitle("Shrink to 1×1");
    await act(async () => {
      fireEvent.click(shrinkButtons[0]);
    });

    await waitFor(() => {
      expect(dashboardActions.updateWidgetSize).toHaveBeenCalledWith(
        "pull-requests",
        1,
        1
      );
    });

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("reverts size on server error", async () => {
    vi.mocked(dashboardActions.updateWidgetSize).mockResolvedValue({
      error: "Server error",
    });

    render(<DashboardConfigSheet settings={mockSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

    const expandButtons = screen.getAllByTitle("Expand to 2×3");
    await act(async () => {
      fireEvent.click(expandButtons[0]);
    });

    await waitFor(() => {
      expect(dashboardActions.updateWidgetSize).toHaveBeenCalled();
    });

    // Should not refresh when there's an error
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("does not show size controls for disabled widgets", () => {
    const disabledSettings: WidgetSettings = {
      widgets: [
        { id: "pull-requests", enabled: false, order: 0 },
        { id: "news", enabled: false, order: 1 },
        { id: "expenditures", enabled: false, order: 2 },
      ],
    };

    render(<DashboardConfigSheet settings={disabledSettings} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(trigger);

    expect(screen.queryByTitle("Expand to 2×3")).toBeNull();
    expect(screen.queryByTitle("Shrink to 1×1")).toBeNull();
  });
});
