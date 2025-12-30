import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ThemeEditor } from "./theme-editor";
import type { ThemeVariables } from "@/lib/theme-utils";

// Mock the color module with proper null handling
vi.mock("@/lib/color", () => ({
  oklchToHex: vi.fn((oklch: string | undefined | null) => {
    if (!oklch) return "#888888";
    if (oklch.includes("0.6")) return "#4488cc";
    if (oklch.includes("0.9")) return "#eeeeff";
    if (oklch.includes("0.2")) return "#222244";
    if (oklch.includes("0.98")) return "#ffffff";
    if (oklch.includes("0.8")) return "#aabbcc";
    return "#888888";
  }),
  hexToOklch: vi.fn(() => ({ l: 0.6, c: 0.2, h: 250 })),
  formatOklchString: vi.fn(
    (oklch: { l: number; c: number; h: number }) => `oklch(${oklch.l} ${oklch.c} ${oklch.h})`
  ),
  isValidHex: vi.fn((hex: string) => /^#[0-9a-f]{6}$/i.test(hex)),
}));

const mockVariables: ThemeVariables = {
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

describe("ThemeEditor", () => {
  const defaultProps = {
    onSave: vi.fn(() => Promise.resolve()),
    onCancel: vi.fn(),
    initialLightVariables: mockVariables,
    initialDarkVariables: mockVariables,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders theme name input", () => {
    render(<ThemeEditor {...defaultProps} />);

    expect(screen.getByLabelText(/theme name/i)).toBeInTheDocument();
  });

  it("renders with initial name", () => {
    render(<ThemeEditor {...defaultProps} initialName="Test Theme" />);

    expect(screen.getByDisplayValue("Test Theme")).toBeInTheDocument();
  });

  it("renders light/dark mode toggle buttons", () => {
    render(<ThemeEditor {...defaultProps} />);

    expect(screen.getByRole("button", { name: /light mode/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dark mode/i })).toBeInTheDocument();
  });

  it("switches to dark mode when dark button is clicked", async () => {
    const user = userEvent.setup();

    render(<ThemeEditor {...defaultProps} />);

    const darkButton = screen.getByRole("button", { name: /dark mode/i });
    await user.click(darkButton);

    // Preview label should update
    expect(screen.getByText(/live preview \(dark mode\)/i)).toBeInTheDocument();
  });

  it("renders Core Colors section", () => {
    render(<ThemeEditor {...defaultProps} />);

    expect(screen.getByText("Core Colors")).toBeInTheDocument();
    expect(screen.getByText(/main ui colors/i)).toBeInTheDocument();
  });

  it("renders Components section", () => {
    render(<ThemeEditor {...defaultProps} />);

    expect(screen.getByText("Components")).toBeInTheDocument();
    expect(screen.getByText(/card and popover/i)).toBeInTheDocument();
  });

  it("renders Advanced section (collapsible)", () => {
    render(<ThemeEditor {...defaultProps} />);

    expect(screen.getByText("Advanced")).toBeInTheDocument();
  });

  it("expands Advanced section when clicked", async () => {
    const user = userEvent.setup();

    render(<ThemeEditor {...defaultProps} />);

    const advancedHeader = screen.getByText("Advanced");
    await user.click(advancedHeader);

    // Should now show Charts section (using getAllByText since Sidebar appears twice)
    await waitFor(() => {
      expect(screen.getByText("Charts")).toBeInTheDocument();
    });
  });

  it("calls onCancel when cancel button is clicked", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(<ThemeEditor {...defaultProps} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalled();
  });

  it("disables save button when name is empty", () => {
    render(<ThemeEditor {...defaultProps} />);

    const saveButton = screen.getByRole("button", { name: /create theme/i });
    expect(saveButton).toBeDisabled();
  });

  it("enables save button when name is provided", async () => {
    const user = userEvent.setup();

    render(<ThemeEditor {...defaultProps} />);

    const nameInput = screen.getByLabelText(/theme name/i);
    await user.type(nameInput, "My Theme");

    const saveButton = screen.getByRole("button", { name: /create theme/i });
    expect(saveButton).not.toBeDisabled();
  });

  it("calls onSave with correct arguments", async () => {
    const onSave = vi.fn(() => Promise.resolve());
    const user = userEvent.setup();

    render(<ThemeEditor {...defaultProps} onSave={onSave} />);

    const nameInput = screen.getByLabelText(/theme name/i);
    await user.type(nameInput, "My Theme");

    const saveButton = screen.getByRole("button", { name: /create theme/i });
    await user.click(saveButton);

    expect(onSave).toHaveBeenCalledWith("My Theme", mockVariables, mockVariables);
  });

  it("shows Save Changes button in edit mode", () => {
    render(<ThemeEditor {...defaultProps} mode="edit" initialName="Existing Theme" />);

    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });

  it("shows Saving... button text when isSaving", () => {
    render(<ThemeEditor {...defaultProps} isSaving initialName="Test" />);

    expect(screen.getByRole("button", { name: /saving/i })).toBeInTheDocument();
  });

  it("disables buttons when isSaving", () => {
    render(<ThemeEditor {...defaultProps} isSaving initialName="Test" />);

    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
  });

  it("displays error message when error prop is provided", () => {
    render(<ThemeEditor {...defaultProps} error="Something went wrong" />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders live preview panel", () => {
    render(<ThemeEditor {...defaultProps} />);

    expect(screen.getByText(/live preview/i)).toBeInTheDocument();
  });

  it("trims whitespace from theme name on save", async () => {
    const onSave = vi.fn(() => Promise.resolve());
    const user = userEvent.setup();

    render(<ThemeEditor {...defaultProps} onSave={onSave} />);

    const nameInput = screen.getByLabelText(/theme name/i);
    await user.type(nameInput, "  My Theme  ");

    const saveButton = screen.getByRole("button", { name: /create theme/i });
    await user.click(saveButton);

    expect(onSave).toHaveBeenCalledWith("My Theme", mockVariables, mockVariables);
  });

  it("renders color pickers for core variables", () => {
    render(<ThemeEditor {...defaultProps} />);

    // Should show multiple color picker labels in the Core Colors section
    expect(screen.getByText("Background")).toBeInTheDocument();
    expect(screen.getByText("Foreground")).toBeInTheDocument();
  });
});
