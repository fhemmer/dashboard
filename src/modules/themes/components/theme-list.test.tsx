import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ThemeList } from "./theme-list";
import type { UserTheme } from "../types";
import type { ThemeVariables } from "@/lib/theme-utils";

// Mock server actions
const mockSetActiveTheme = vi.fn();
const mockDeleteTheme = vi.fn();

vi.mock("@/app/themes/actions", () => ({
  setActiveTheme: (id: string | null) => {
    mockSetActiveTheme(id);
    return Promise.resolve({ success: true });
  },
  deleteTheme: (id: string) => {
    mockDeleteTheme(id);
    return Promise.resolve({ success: true });
  },
}));

// Mock useRouter
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
    push: vi.fn(),
  }),
}));

// Mock useCustomTheme
const mockApplyCustomTheme = vi.fn();
const mockClearCustomTheme = vi.fn();
let mockActiveCustomThemeId: string | null = null;

vi.mock("@/components/custom-theme-provider", () => ({
  useCustomTheme: () => ({
    applyCustomTheme: mockApplyCustomTheme,
    clearCustomTheme: mockClearCustomTheme,
    activeCustomThemeId: mockActiveCustomThemeId,
  }),
}));

// Mock oklchToHex
vi.mock("@/lib/color", () => ({
  oklchToHex: vi.fn((oklch: string) => {
    if (!oklch) return "#888888";
    if (oklch.includes("0.6")) return "#4488cc";
    if (oklch.includes("0.9")) return "#eeeeff";
    if (oklch.includes("0.2")) return "#222244";
    if (oklch.includes("0.98")) return "#ffffff";
    if (oklch.includes("0.8")) return "#aabbcc";
    return "#888888";
  }),
}));

const mockLightVariables: ThemeVariables = {
  background: "oklch(0.98 0.01 250)",
  foreground: "oklch(0.2 0.02 250)",
  card: "oklch(0.95 0.01 250)",
  "card-foreground": "oklch(0.2 0.02 250)",
  popover: "oklch(0.98 0.01 250)",
  "popover-foreground": "oklch(0.2 0.02 250)",
  primary: "oklch(0.6 0.2 250)",
  "primary-foreground": "oklch(0.98 0.01 250)",
  secondary: "oklch(0.9 0.05 250)",
  "secondary-foreground": "oklch(0.2 0.02 250)",
  muted: "oklch(0.9 0.02 250)",
  "muted-foreground": "oklch(0.5 0.02 250)",
  accent: "oklch(0.8 0.1 280)",
  "accent-foreground": "oklch(0.2 0.02 250)",
  destructive: "oklch(0.6 0.2 25)",
  border: "oklch(0.8 0.02 250)",
  input: "oklch(0.8 0.02 250)",
  ring: "oklch(0.6 0.2 250)",
  "chart-1": "oklch(0.7 0.15 250)",
  "chart-2": "oklch(0.65 0.15 200)",
  "chart-3": "oklch(0.6 0.15 150)",
  "chart-4": "oklch(0.55 0.15 100)",
  "chart-5": "oklch(0.5 0.15 50)",
  sidebar: "oklch(0.95 0.02 250)",
  "sidebar-foreground": "oklch(0.2 0.02 250)",
  "sidebar-primary": "oklch(0.6 0.2 250)",
  "sidebar-primary-foreground": "oklch(0.98 0.01 250)",
  "sidebar-accent": "oklch(0.85 0.05 250)",
  "sidebar-accent-foreground": "oklch(0.2 0.02 250)",
  "sidebar-border": "oklch(0.8 0.02 250)",
  "sidebar-ring": "oklch(0.6 0.2 250)",
};

const mockTheme: UserTheme = {
  id: "theme-1",
  user_id: "user-1",
  name: "Test Theme",
  light_variables: mockLightVariables,
  dark_variables: mockLightVariables,
  is_active: false,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockThemes: UserTheme[] = [
  mockTheme,
  {
    ...mockTheme,
    id: "theme-2",
    name: "Second Theme",
    is_active: false,
  },
  {
    ...mockTheme,
    id: "theme-3",
    name: "Another Theme",
  },
];

describe("ThemeList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveCustomThemeId = null;
  });

  it("renders all themes", () => {
    render(<ThemeList themes={mockThemes} />);

    expect(screen.getByText("Test Theme")).toBeInTheDocument();
    expect(screen.getByText("Second Theme")).toBeInTheDocument();
    expect(screen.getByText("Another Theme")).toBeInTheDocument();
  });

  it("renders empty state when no themes", () => {
    render(<ThemeList themes={[]} />);

    expect(screen.getByText(/no custom themes/i)).toBeInTheDocument();
  });

  it("shows create theme link in empty state", () => {
    render(<ThemeList themes={[]} />);

    expect(screen.getByRole("link", { name: /create theme/i })).toBeInTheDocument();
  });

  it("shows activate button for each theme", () => {
    render(<ThemeList themes={mockThemes} />);

    const activateButtons = screen.getAllByRole("button", { name: /activate/i });
    expect(activateButtons.length).toBe(3);
  });

  it("shows edit links for each theme", () => {
    render(<ThemeList themes={mockThemes} />);

    const editLinks = screen.getAllByRole("link", { name: /edit/i });
    expect(editLinks.length).toBe(3);
  });

  it("shows delete buttons for each theme", () => {
    render(<ThemeList themes={mockThemes} />);

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    expect(deleteButtons.length).toBe(3);
  });

  it("calls applyCustomTheme when activate is clicked", async () => {
    const user = userEvent.setup();

    render(<ThemeList themes={mockThemes} />);

    const activateButtons = screen.getAllByRole("button", { name: /activate/i });
    await user.click(activateButtons[0]);

    // The handler is called via transition, check mock was called
    expect(mockApplyCustomTheme).toHaveBeenCalled();
  });

  it("renders theme cards in a grid", () => {
    const { container } = render(<ThemeList themes={mockThemes} />);

    const grid = container.querySelector(".grid");
    expect(grid).toBeInTheDocument();
  });

  it("shows updated date for each theme", () => {
    render(<ThemeList themes={mockThemes} />);

    // All themes have same date
    const dates = screen.getAllByText(/updated/i);
    expect(dates.length).toBe(3);
  });

  it("shows Active badge when theme is active", () => {
    mockActiveCustomThemeId = "theme-1";
    render(<ThemeList themes={mockThemes} />);

    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows Deactivate button for active theme", () => {
    mockActiveCustomThemeId = "theme-1";
    render(<ThemeList themes={mockThemes} />);

    expect(screen.getByRole("button", { name: /deactivate/i })).toBeInTheDocument();
  });

  it("calls clearCustomTheme when deactivate is clicked", async () => {
    mockActiveCustomThemeId = "theme-1";
    const user = userEvent.setup();

    render(<ThemeList themes={mockThemes} />);

    const deactivateButton = screen.getByRole("button", { name: /deactivate/i });
    await user.click(deactivateButton);

    expect(mockClearCustomTheme).toHaveBeenCalled();
  });

  it("opens delete confirmation dialog when delete is clicked", async () => {
    const user = userEvent.setup();

    render(<ThemeList themes={mockThemes} />);

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await user.click(deleteButtons[0]);

    // Dialog should open
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it("calls deleteTheme when delete is confirmed", async () => {
    const user = userEvent.setup();

    render(<ThemeList themes={mockThemes} />);

    // Open delete dialog
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await user.click(deleteButtons[0]);

    // Confirm deletion
    const confirmButton = screen.getByRole("button", { name: /^delete$/i });
    await user.click(confirmButton);

    expect(mockDeleteTheme).toHaveBeenCalledWith("theme-1");
  });
});
