import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemePicker } from "./theme-picker";

// Mock the useTheme hook
const mockSetTheme = vi.fn();

vi.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({
    theme: "default",
    setTheme: mockSetTheme,
  }),
}));

// Mock the theme actions to prevent Supabase calls
vi.mock("@/app/themes/actions", () => ({
  getUserThemes: vi.fn().mockResolvedValue([]),
  getActiveCustomTheme: vi.fn().mockResolvedValue(null),
  setActiveTheme: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock the useCustomTheme hook
const mockApplyCustomTheme = vi.fn();
const mockClearCustomTheme = vi.fn();

vi.mock("@/components/custom-theme-provider", () => ({
  useCustomTheme: () => ({
    customThemes: [],
    activeCustomTheme: null,
    isLoading: false,
    applyCustomTheme: mockApplyCustomTheme,
    clearCustomTheme: mockClearCustomTheme,
    refreshThemes: vi.fn(),
  }),
}));

describe("ThemePicker", () => {
  beforeEach(() => {
    mockSetTheme.mockClear();
    mockApplyCustomTheme.mockClear();
    mockClearCustomTheme.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders select with all theme options", () => {
    render(<ThemePicker />);

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();

    expect(screen.getByRole("option", { name: "Default" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Ocean" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Forest" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Sunset" })).toBeInTheDocument();
  });

  it("renders theme preview buttons", () => {
    render(<ThemePicker />);

    expect(screen.getByRole("button", { name: /default/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ocean/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /forest/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sunset/i })).toBeInTheDocument();
  });

  it("calls setTheme when select changes", () => {
    render(<ThemePicker />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "ocean" } });

    expect(mockSetTheme).toHaveBeenCalledWith("ocean");
  });

  it("calls setTheme when preview button is clicked", () => {
    render(<ThemePicker />);

    const forestButton = screen.getByRole("button", { name: /forest/i });
    fireEvent.click(forestButton);

    expect(mockSetTheme).toHaveBeenCalledWith("forest");
  });

  it("syncs server theme to localStorage on mount when different", () => {
    render(<ThemePicker defaultValue="sunset" />);

    // Should call setTheme to sync server value
    expect(mockSetTheme).toHaveBeenCalledWith("sunset");
  });

  it("uses custom name prop for form submission", () => {
    render(<ThemePicker name="custom-theme" />);

    const select = screen.getByRole("combobox");
    expect(select).toHaveAttribute("name", "custom-theme");
  });

  it("does not sync when defaultValue is default", () => {
    render(<ThemePicker defaultValue="default" />);

    // Should not call setTheme when defaultValue is "default"
    expect(mockSetTheme).not.toHaveBeenCalled();
  });

  it("only syncs server theme once on initial mount", () => {
    const { rerender } = render(<ThemePicker defaultValue="sunset" />);

    // First render syncs
    expect(mockSetTheme).toHaveBeenCalledTimes(1);

    // Rerender should not sync again
    rerender(<ThemePicker defaultValue="sunset" />);
    expect(mockSetTheme).toHaveBeenCalledTimes(1);
  });
});
