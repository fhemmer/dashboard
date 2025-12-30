import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ColorPicker } from "./color-picker";

// Mock the color module with proper null handling
vi.mock("@/lib/color", () => ({
  oklchToHex: vi.fn((oklch: string | undefined | null) => {
    if (!oklch) return "#000000";
    if (oklch.includes("0.6 0.2 250")) return "#0081f1";
    if (oklch.includes("0.8 0.1 180")) return "#44bbaa";
    return "#000000";
  }),
  hexToOklch: vi.fn((hex: string) => {
    if (hex === "#ff0000") return { l: 0.6, c: 0.2, h: 250 };
    if (hex === "#00ff00") return { l: 0.8, c: 0.3, h: 150 };
    return null;
  }),
  formatOklchString: vi.fn(
    (oklch: { l: number; c: number; h?: number }) => `oklch(${oklch.l} ${oklch.c} ${oklch.h ?? 0})`
  ),
  isValidHex: vi.fn((hex: string) => /^#[0-9a-f]{6}$/i.test(hex)),
}));

describe("ColorPicker", () => {
  const defaultProps = {
    variableName: "primary" as const,
    label: "Primary Color",
    oklchValue: "oklch(0.6 0.2 250)",
    onChange: vi.fn(),
  };

  it("renders label correctly", () => {
    render(<ColorPicker {...defaultProps} />);

    expect(screen.getByText("Primary Color")).toBeInTheDocument();
  });

  it("displays OKLCH value", () => {
    render(<ColorPicker {...defaultProps} />);

    expect(screen.getByText("oklch(0.6 0.2 250)")).toBeInTheDocument();
  });

  it("shows converted HEX value in input", () => {
    render(<ColorPicker {...defaultProps} />);

    const textInput = screen.getByRole("textbox");
    // The mock returns #0081f1 for this oklch value
    expect(textInput).toHaveValue("#0081f1");
  });

  it("calls onChange when HEX input changes with valid value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<ColorPicker {...defaultProps} onChange={onChange} />);

    const textInput = screen.getByRole("textbox");
    await user.clear(textInput);
    await user.type(textInput, "#ff0000");

    // The component calls onChange with the variable name and the OKLCH object from hexToOklch
    expect(onChange).toHaveBeenCalledWith("primary", { l: 0.6, c: 0.2, h: 250 });
  });

  it("does not call onChange for invalid HEX", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<ColorPicker {...defaultProps} onChange={onChange} />);

    const textInput = screen.getByRole("textbox");
    await user.clear(textInput);
    await user.type(textInput, "invalid");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("has accessible color picker label", () => {
    render(<ColorPicker {...defaultProps} />);

    expect(screen.getByLabelText("Color picker for Primary Color")).toBeInTheDocument();
  });

  it("handles empty oklchValue with default hex fallback", () => {
    render(<ColorPicker {...defaultProps} oklchValue="" />);

    const textInput = screen.getByRole("textbox");
    expect(textInput).toHaveValue("#000000");
  });

  it("updates display when oklchValue prop changes", () => {
    const { rerender } = render(<ColorPicker {...defaultProps} oklchValue="oklch(0.6 0.2 250)" />);

    rerender(<ColorPicker {...defaultProps} oklchValue="oklch(0.8 0.1 180)" />);

    expect(screen.getByText("oklch(0.8 0.1 180)")).toBeInTheDocument();
  });

  it("normalizes hex input for color picker", () => {
    render(<ColorPicker {...defaultProps} />);

    const colorPicker = screen.getByLabelText(
      "Color picker for Primary Color"
    ) as HTMLInputElement;
    // Color picker value should be a valid hex
    expect(colorPicker.value).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("handles native color input change", () => {
    const onChange = vi.fn();

    render(<ColorPicker {...defaultProps} onChange={onChange} />);

    const colorPicker = screen.getByLabelText("Color picker for Primary Color");
    fireEvent.change(colorPicker, { target: { value: "#00ff00" } });

    // Should call onChange with converted oklch
    expect(onChange).toHaveBeenCalledWith("primary", { l: 0.8, c: 0.3, h: 150 });
  });

  it("does not call onChange when hexToOklch returns null for color input", () => {
    const onChange = vi.fn();

    render(<ColorPicker {...defaultProps} onChange={onChange} />);

    const colorPicker = screen.getByLabelText("Color picker for Primary Color");
    fireEvent.change(colorPicker, { target: { value: "#aabbcc" } });

    // hexToOklch returns null for #aabbcc, so onChange should not be called
    expect(onChange).not.toHaveBeenCalled();
  });
});
