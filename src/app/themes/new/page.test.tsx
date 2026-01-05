"use client";

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock actions
const mockCreateTheme = vi.fn();
vi.mock("@/app/themes/actions", () => ({
  createTheme: (...args: unknown[]) => mockCreateTheme(...args),
}));

// Mock custom theme provider
const mockApplyCustomTheme = vi.fn();
vi.mock("@/components/custom-theme-provider", () => ({
  useCustomTheme: () => ({
    applyCustomTheme: mockApplyCustomTheme,
  }),
}));

// Mock ThemeEditor
vi.mock("@/modules/themes/components/theme-editor", () => ({
  ThemeEditor: ({ onSave, onCancel, isSaving, error, mode }: {
    onSave: (name: string, light: object, dark: object) => void;
    onCancel: () => void;
    isSaving: boolean;
    error: string | null;
    mode: string;
  }) => (
    <div data-testid="theme-editor">
      <span data-testid="mode">{mode}</span>
      {error && <span data-testid="error">{error}</span>}
      {isSaving && <span data-testid="saving">Saving...</span>}
      <button onClick={() => onSave("Test Theme", { primary: "#000" }, { primary: "#fff" })} data-testid="save-btn">
        Save
      </button>
      <button onClick={onCancel} data-testid="cancel-btn">Cancel</button>
    </div>
  ),
}));

import NewThemePage from "./page";

describe("NewThemePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page with correct heading", () => {
    render(<NewThemePage />);

    expect(screen.getByText("Create New Theme")).toBeInTheDocument();
    expect(screen.getByText("Customize colors starting from your current theme")).toBeInTheDocument();
  });

  it("renders theme editor in create mode", () => {
    render(<NewThemePage />);

    expect(screen.getByTestId("mode")).toHaveTextContent("create");
  });

  it("navigates back to themes on cancel", () => {
    render(<NewThemePage />);

    fireEvent.click(screen.getByTestId("cancel-btn"));

    expect(mockPush).toHaveBeenCalledWith("/themes");
  });

  it("creates theme and navigates on successful save", async () => {
    mockCreateTheme.mockResolvedValue({
      success: true,
      theme: { id: "theme-123", name: "Test Theme" },
    });

    render(<NewThemePage />);

    fireEvent.click(screen.getByTestId("save-btn"));

    await waitFor(() => {
      expect(mockCreateTheme).toHaveBeenCalledWith(
        "Test Theme",
        { primary: "#000" },
        { primary: "#fff" }
      );
    });

    await waitFor(() => {
      expect(mockApplyCustomTheme).toHaveBeenCalledWith(
        "theme-123",
        { primary: "#000" },
        { primary: "#fff" }
      );
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/themes");
    });
  });

  it("shows error when create fails", async () => {
    mockCreateTheme.mockResolvedValue({
      success: false,
      error: "Theme name already exists",
    });

    render(<NewThemePage />);

    fireEvent.click(screen.getByTestId("save-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("error")).toHaveTextContent("Theme name already exists");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows default error when create fails without error message", async () => {
    mockCreateTheme.mockResolvedValue({
      success: false,
    });

    render(<NewThemePage />);

    fireEvent.click(screen.getByTestId("save-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("error")).toHaveTextContent("Failed to create theme");
    });
  });
});
