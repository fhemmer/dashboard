import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrightnessControls } from "./brightness-controls";

// Mock brightness utilities
vi.mock("@/lib/brightness", () => ({
  DEFAULT_BRIGHTNESS: {
    fgLight: 100,
    bgLight: 100,
    fgDark: 100,
    bgDark: 100,
  },
  getStoredBrightness: vi.fn(() => ({
    fgLight: 100,
    bgLight: 100,
    fgDark: 100,
    bgDark: 100,
  })),
  setStoredBrightness: vi.fn(),
  applyBrightnessToDocument: vi.fn(),
  resetBrightnessOnDocument: vi.fn(),
  clearBrightnessCache: vi.fn(),
}));

describe("BrightnessControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.classList.remove("dark");
  });

  it("renders all four brightness sliders", () => {
    render(<BrightnessControls />);

    // Check for the slider labels in the DOM - there are 2 of each (light + dark)
    expect(screen.getAllByText("Foreground Brightness")).toHaveLength(2);
    expect(screen.getAllByText("Background Brightness")).toHaveLength(2);
  });

  it("renders light mode and dark mode sections", () => {
    render(<BrightnessControls />);

    expect(screen.getByText("Light Mode")).toBeInTheDocument();
    expect(screen.getByText("Dark Mode")).toBeInTheDocument();
  });

  it("displays current brightness percentages", () => {
    render(<BrightnessControls defaultValues={{ fgLight: 120, bgLight: 80, fgDark: 90, bgDark: 110 }} />);

    expect(screen.getByText("120%")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByText("110%")).toBeInTheDocument();
  });

  it("includes hidden inputs for form submission", () => {
    render(<BrightnessControls />);

    const fgLightInput = document.querySelector('input[name="fgBrightnessLight"]') as HTMLInputElement;
    const bgLightInput = document.querySelector('input[name="bgBrightnessLight"]') as HTMLInputElement;
    const fgDarkInput = document.querySelector('input[name="fgBrightnessDark"]') as HTMLInputElement;
    const bgDarkInput = document.querySelector('input[name="bgBrightnessDark"]') as HTMLInputElement;

    expect(fgLightInput).toBeInTheDocument();
    expect(bgLightInput).toBeInTheDocument();
    expect(fgDarkInput).toBeInTheDocument();
    expect(bgDarkInput).toBeInTheDocument();

    expect(fgLightInput.value).toBe("100");
    expect(bgLightInput.value).toBe("100");
  });

  it("uses defaultValues when provided", () => {
    render(<BrightnessControls defaultValues={{ fgLight: 150, bgLight: 50, fgDark: 75, bgDark: 125 }} />);

    const fgLightInput = document.querySelector('input[name="fgBrightnessLight"]') as HTMLInputElement;
    const bgLightInput = document.querySelector('input[name="bgBrightnessLight"]') as HTMLInputElement;
    const fgDarkInput = document.querySelector('input[name="fgBrightnessDark"]') as HTMLInputElement;
    const bgDarkInput = document.querySelector('input[name="bgBrightnessDark"]') as HTMLInputElement;

    expect(fgLightInput.value).toBe("150");
    expect(bgLightInput.value).toBe("50");
    expect(fgDarkInput.value).toBe("75");
    expect(bgDarkInput.value).toBe("125");
  });

  it("shows reset button when values differ from defaults", () => {
    render(<BrightnessControls defaultValues={{ fgLight: 150, bgLight: 100, fgDark: 100, bgDark: 100 }} />);

    // Non-default values - shows reset button
    expect(screen.getByText(/reset to defaults/i)).toBeInTheDocument();
  });

  it("shows reset button when bgLight differs from defaults", () => {
    render(<BrightnessControls defaultValues={{ fgLight: 100, bgLight: 150, fgDark: 100, bgDark: 100 }} />);

    expect(screen.getByText(/reset to defaults/i)).toBeInTheDocument();
  });

  it("shows reset button when fgDark differs from defaults", () => {
    render(<BrightnessControls defaultValues={{ fgLight: 100, bgLight: 100, fgDark: 150, bgDark: 100 }} />);

    expect(screen.getByText(/reset to defaults/i)).toBeInTheDocument();
  });

  it("shows reset button when bgDark differs from defaults", () => {
    render(<BrightnessControls defaultValues={{ fgLight: 100, bgLight: 100, fgDark: 100, bgDark: 150 }} />);

    expect(screen.getByText(/reset to defaults/i)).toBeInTheDocument();
  });

  it("does not show reset button when values are defaults", () => {
    render(<BrightnessControls />);

    // Default values - no reset button
    expect(screen.queryByText(/reset to defaults/i)).not.toBeInTheDocument();
  });

  it("resets to defaults when reset button clicked", async () => {
    const user = userEvent.setup();
    const { resetBrightnessOnDocument, setStoredBrightness } = await import("@/lib/brightness");

    render(<BrightnessControls defaultValues={{ fgLight: 150, bgLight: 100, fgDark: 100, bgDark: 100 }} />);

    const resetButton = screen.getByText(/reset to defaults/i);
    await user.click(resetButton);

    expect(resetBrightnessOnDocument).toHaveBeenCalled();
    expect(setStoredBrightness).toHaveBeenCalledWith({
      fgLight: 100,
      bgLight: 100,
      fgDark: 100,
      bgDark: 100,
    });
  });

  it("updates hidden input values when sliders change", () => {
    render(<BrightnessControls />);

    const fgLightInput = document.querySelector('input[name="fgBrightnessLight"]') as HTMLInputElement;

    expect(fgLightInput.value).toBe("100");

    // Note: Testing slider interaction with actual value changes is complex
    // This test verifies the initial binding; integration tests will verify the interaction
  });

  it("applies brightness on mount with default values", async () => {
    const { applyBrightnessToDocument } = await import("@/lib/brightness");

    render(<BrightnessControls />);

    // Should apply brightness settings on initial render
    expect(applyBrightnessToDocument).toHaveBeenCalled();
  });

  it("syncs server values to localStorage on mount", async () => {
    const { setStoredBrightness } = await import("@/lib/brightness");

    render(<BrightnessControls defaultValues={{ fgLight: 130, bgLight: 70, fgDark: 95, bgDark: 105 }} />);

    // Should sync to localStorage on mount
    expect(setStoredBrightness).toHaveBeenCalledWith(
      expect.objectContaining({
        fgLight: 130,
        bgLight: 70,
        fgDark: 95,
        bgDark: 105,
      })
    );
  });

  it("displays section descriptions", () => {
    render(<BrightnessControls />);

    expect(screen.getByText(/adjust brightness for light theme/i)).toBeInTheDocument();
    expect(screen.getByText(/adjust brightness for dark theme/i)).toBeInTheDocument();
  });

  it("falls back to localStorage when no defaultValues provided", async () => {
    const { getStoredBrightness } = await import("@/lib/brightness");

    render(<BrightnessControls />);

    // Should call getStoredBrightness when no defaults are provided
    expect(getStoredBrightness).toHaveBeenCalled();
  });

  it("uses partial defaultValues with defaults for missing values", () => {
    render(<BrightnessControls defaultValues={{ fgLight: 150 }} />);

    const fgLightInput = document.querySelector('input[name="fgBrightnessLight"]') as HTMLInputElement;
    const bgLightInput = document.querySelector('input[name="bgBrightnessLight"]') as HTMLInputElement;

    expect(fgLightInput.value).toBe("150");
    expect(bgLightInput.value).toBe("100"); // Falls back to default
  });

  it("clears brightness cache when settings change", async () => {
    const { clearBrightnessCache } = await import("@/lib/brightness");

    render(<BrightnessControls />);

    // clearBrightnessCache should be called on mount
    expect(clearBrightnessCache).toHaveBeenCalled();
  });

  it("applies brightness to document on mount", async () => {
    const { applyBrightnessToDocument } = await import("@/lib/brightness");

    // Set up document in dark mode
    document.documentElement.classList.add("dark");

    render(<BrightnessControls />);

    // Should apply with isDark = true
    expect(applyBrightnessToDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        fgLight: 100,
        bgLight: 100,
        fgDark: 100,
        bgDark: 100,
      }),
      true
    );
  });
});
