import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FontPicker } from "./font-picker";

// Mock the useFont hook
const mockSetFont = vi.fn();

vi.mock("@/hooks/use-font", () => ({
  useFont: () => ({
    font: "geist",
    setFont: mockSetFont,
  }),
}));

describe("FontPicker", () => {
  beforeEach(() => {
    mockSetFont.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders select with all font options", () => {
    render(<FontPicker />);

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();

    expect(screen.getByRole("option", { name: "Geist" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Inter" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Roboto" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Nunito" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Open Sans" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Lato" })).toBeInTheDocument();
  });

  it("renders font preview buttons", () => {
    render(<FontPicker />);

    expect(screen.getByRole("button", { name: /geist/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /inter/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /roboto/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /nunito/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open sans/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /lato/i })).toBeInTheDocument();
  });

  it("calls setFont when select changes", () => {
    render(<FontPicker />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "inter" } });

    expect(mockSetFont).toHaveBeenCalledWith("inter");
  });

  it("calls setFont when preview button is clicked", () => {
    render(<FontPicker />);

    const robotoButton = screen.getByRole("button", { name: /roboto/i });
    fireEvent.click(robotoButton);

    expect(mockSetFont).toHaveBeenCalledWith("roboto");
  });

  it("syncs server font to localStorage on mount when different", () => {
    render(<FontPicker defaultValue="nunito" />);

    // Should call setFont to sync server value
    expect(mockSetFont).toHaveBeenCalledWith("nunito");
  });

  it("uses custom name prop for form submission", () => {
    render(<FontPicker name="custom-font" />);

    const select = screen.getByRole("combobox");
    expect(select).toHaveAttribute("name", "custom-font");
  });

  it("does not sync when defaultValue is geist (default)", () => {
    render(<FontPicker defaultValue="geist" />);

    // Should not call setFont when defaultValue is "geist"
    expect(mockSetFont).not.toHaveBeenCalled();
  });

  it("only syncs server font once on initial mount", () => {
    const { rerender } = render(<FontPicker defaultValue="lato" />);

    // First render syncs
    expect(mockSetFont).toHaveBeenCalledTimes(1);

    // Rerender should not sync again
    rerender(<FontPicker defaultValue="lato" />);
    expect(mockSetFont).toHaveBeenCalledTimes(1);
  });

  it("renders font preview text for each font", () => {
    render(<FontPicker />);

    // Each preview should show the sample text
    const previews = screen.getAllByText("The quick brown fox");
    expect(previews).toHaveLength(11);
  });
});
