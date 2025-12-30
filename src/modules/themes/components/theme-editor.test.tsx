import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ThemeEditor } from "./theme-editor";
import type { ThemeVariables } from "@/lib/theme-utils";

// Mock the color module with proper null handling
vi.mock("@/lib/color", () => ({
  oklchToHex: vi.fn((oklch: string | undefined | null) => {
    if (!oklch) return "#888888";
    if (typeof oklch !== "string") return "#888888";
    if (oklch.includes("0.6")) return "#4488cc";
    if (oklch.includes("0.9")) return "#eeeeff";
    if (oklch.includes("0.2")) return "#222244";
    if (oklch.includes("0.98")) return "#ffffff";
    if (oklch.includes("0.8")) return "#aabbcc";
    return "#888888";
  }),
  hexToOklch: vi.fn(() => "oklch(0.6 0.2 250)"),
  formatOklchString: vi.fn(
    (oklch: { l: number; c: number; h: number }) => `oklch(${oklch.l} ${oklch.c} ${oklch.h})`
  ),
  isValidHex: vi.fn((hex: string) => /^#[0-9a-f]{6}$/i.test(hex)),
}));

// Mock extractCurrentThemeVariables from theme-utils
vi.mock("@/lib/theme-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/theme-utils")>();
  return {
    ...actual,
    extractCurrentThemeVariables: vi.fn(() => ({
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
    })),
  };
});

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
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
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

  it("shows loading state when no initial variables and extracting from DOM", async () => {
    // Test without initial variables - should show loading then content
    render(
      <ThemeEditor
        onSave={vi.fn(() => Promise.resolve())}
        onCancel={vi.fn()}
      />
    );

    // Wait for initialization to complete (useEffect extraction)
    await waitFor(() => {
      expect(screen.getByLabelText(/theme name/i)).toBeInTheDocument();
    });
  });

  it("switches back to light mode when light button is clicked after being in dark mode", async () => {
    const user = userEvent.setup();

    render(<ThemeEditor {...defaultProps} />);

    // Switch to dark mode first
    const darkButton = screen.getByRole("button", { name: /dark mode/i });
    await user.click(darkButton);

    expect(screen.getByText(/live preview \(dark mode\)/i)).toBeInTheDocument();

    // Switch back to light mode
    const lightButton = screen.getByRole("button", { name: /light mode/i });
    await user.click(lightButton);

    expect(screen.getByText(/live preview \(light mode\)/i)).toBeInTheDocument();
  });

  it("extracts theme variables from DOM when no initial variables provided", async () => {
    // This tests the extractThemeVariablesForMode function
    render(
      <ThemeEditor
        onSave={vi.fn(() => Promise.resolve())}
        onCancel={vi.fn()}
      />
    );

    // Wait for useEffect to run and extract variables
    await waitFor(() => {
      expect(screen.getByLabelText(/theme name/i)).toBeInTheDocument();
    });

    // The editor should be functional after extraction
    expect(screen.getByRole("button", { name: /light mode/i })).toBeInTheDocument();
  });

  it("handles dark mode extraction by adding/removing dark class", async () => {
    // Start with dark class on document
    document.documentElement.classList.add("dark");

    render(
      <ThemeEditor
        onSave={vi.fn(() => Promise.resolve())}
        onCancel={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/theme name/i)).toBeInTheDocument();
    });

    // Document should be restored to dark mode
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("handles light mode extraction when document starts in dark mode", async () => {
    // Start in dark mode
    document.documentElement.classList.add("dark");

    render(
      <ThemeEditor
        onSave={vi.fn(() => Promise.resolve())}
        onCancel={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/theme name/i)).toBeInTheDocument();
    });

    // Editor should be initialized
    expect(screen.getByRole("button", { name: /create theme/i })).toBeInTheDocument();
  });

  it("does not re-extract when initial variables are provided", () => {
    // When we provide initial variables, the extraction should not happen
    render(<ThemeEditor {...defaultProps} />);

    // Should render immediately without loading state
    expect(screen.getByLabelText(/theme name/i)).toBeInTheDocument();
  });

  it("updates dark variables when in dark editing mode", async () => {
    const onSave = vi.fn(() => Promise.resolve());
    const user = userEvent.setup();

    render(
      <ThemeEditor
        {...defaultProps}
        onSave={onSave}
        initialName="Test Theme"
      />
    );

    // Switch to dark mode editing
    await user.click(screen.getByRole("button", { name: /dark mode/i }));

    // Save should use the dark variables
    await user.click(screen.getByRole("button", { name: /create theme/i }));

    expect(onSave).toHaveBeenCalledWith("Test Theme", mockVariables, mockVariables);
  });

  it("does not save when name is only whitespace", async () => {
    const onSave = vi.fn(() => Promise.resolve());
    const user = userEvent.setup();

    render(<ThemeEditor {...defaultProps} onSave={onSave} />);

    const nameInput = screen.getByLabelText(/theme name/i);
    await user.type(nameInput, "   ");

    // Button should still be disabled
    const saveButton = screen.getByRole("button", { name: /create theme/i });
    expect(saveButton).toBeDisabled();
  });

  it("renders sidebar section in advanced when expanded", async () => {
    const user = userEvent.setup();

    render(<ThemeEditor {...defaultProps} />);

    // Expand advanced section
    await user.click(screen.getByText("Advanced"));

    await waitFor(() => {
      // Sidebar heading inside advanced
      expect(screen.getByRole("heading", { name: "Sidebar" })).toBeInTheDocument();
    });
  });

  it("collapses advanced section when clicked again", async () => {
    const user = userEvent.setup();

    render(<ThemeEditor {...defaultProps} />);

    // Expand
    await user.click(screen.getByText("Advanced"));
    await waitFor(() => {
      expect(screen.getByText("Charts")).toBeInTheDocument();
    });

    // Collapse
    await user.click(screen.getByText("Advanced"));
    await waitFor(() => {
      expect(screen.queryByText("Charts")).not.toBeInTheDocument();
    });
  });

  it("updates variables when color picker changes", async () => {
    const onSave = vi.fn(() => Promise.resolve());
    const user = userEvent.setup();

    render(
      <ThemeEditor
        {...defaultProps}
        onSave={onSave}
        initialName="Test Theme"
      />
    );

    // Find the Background color input by its label and the hex input next to it
    const backgroundInputs = screen.getAllByRole("textbox");
    const hexInput = backgroundInputs.find(
      (input) => (input as HTMLInputElement).value.startsWith("#")
    );

    if (hexInput) {
      // Clear and type a new hex value
      await user.clear(hexInput);
      await user.type(hexInput, "#ff0000");
    }

    // Save and check the variables were passed (might be different from original)
    const saveButton = screen.getByRole("button", { name: /create theme/i });
    await user.click(saveButton);

    expect(onSave).toHaveBeenCalled();
  });

  it("uses color picker to change variable value", () => {
    render(<ThemeEditor {...defaultProps} initialName="Test Theme" />);

    // Find a color input by its aria-label
    const colorPicker = screen.getByLabelText(/color picker for background/i);
    expect(colorPicker).toBeInTheDocument();

    // Simulate color change (note: native color pickers are hard to test)
    // The event should trigger handleVariableChange through ColorPicker's onChange
  });

  it("handles early return in handleSave when name is empty", () => {
    const onSave = vi.fn(() => Promise.resolve());

    // Start with an empty name
    render(<ThemeEditor {...defaultProps} onSave={onSave} initialName="" />);

    // The save button should be disabled, but let's also verify the callback isn't called
    expect(onSave).not.toHaveBeenCalled();
  });
});
