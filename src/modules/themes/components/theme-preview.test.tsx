import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MiniThemePreview, ThemePreviewCard } from "./theme-preview";
import type { ThemeVariables } from "@/lib/theme-utils";

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

describe("MiniThemePreview", () => {
  it("renders color swatches based on variables", () => {
    const { container } = render(<MiniThemePreview variables={mockVariables} />);

    // Should render 3 color circles
    const circles = container.querySelectorAll(".rounded-full");
    expect(circles.length).toBe(3);
  });

  it("renders with correct structure", () => {
    const { container } = render(<MiniThemePreview variables={mockVariables} />);

    // Should have the main wrapper
    const wrapper = container.firstChild;
    expect(wrapper).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <MiniThemePreview variables={mockVariables} className="test-class" />
    );

    expect(container.firstChild).toHaveClass("test-class");
  });

  it("uses primary, accent, and secondary colors", () => {
    const { container } = render(<MiniThemePreview variables={mockVariables} />);

    const circles = container.querySelectorAll(".rounded-full");
    expect(circles[0]).toHaveStyle({ backgroundColor: mockVariables.primary });
    expect(circles[1]).toHaveStyle({ backgroundColor: mockVariables.accent });
    expect(circles[2]).toHaveStyle({ backgroundColor: mockVariables.secondary });
  });
});

describe("ThemePreviewCard", () => {
  it("renders preview card title", () => {
    render(<ThemePreviewCard variables={mockVariables} />);

    expect(screen.getByText("Preview Card")).toBeInTheDocument();
  });

  it("renders button variants", () => {
    render(<ThemePreviewCard variables={mockVariables} />);

    expect(screen.getByRole("button", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Secondary" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Destructive" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Outline" })).toBeInTheDocument();
  });

  it("renders sample input field", () => {
    render(<ThemePreviewCard variables={mockVariables} />);

    expect(screen.getByPlaceholderText("Sample input field")).toBeInTheDocument();
  });

  it("renders muted text", () => {
    render(<ThemePreviewCard variables={mockVariables} />);

    expect(
      screen.getByText("This is muted text for less important information.")
    ).toBeInTheDocument();
  });

  it("renders chart colors section", () => {
    render(<ThemePreviewCard variables={mockVariables} />);

    expect(screen.getByText("Chart Colors")).toBeInTheDocument();
  });

  it("renders sidebar preview section", () => {
    render(<ThemePreviewCard variables={mockVariables} />);

    expect(screen.getByText("Sidebar Preview")).toBeInTheDocument();
    expect(screen.getByText("Active Item")).toBeInTheDocument();
    expect(screen.getByText("Hover Item")).toBeInTheDocument();
  });

  it("applies CSS custom properties from variables", () => {
    const { container } = render(<ThemePreviewCard variables={mockVariables} />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ "--primary": mockVariables.primary });
    expect(wrapper).toHaveStyle({ "--background": mockVariables.background });
  });

  it("applies custom className", () => {
    const { container } = render(
      <ThemePreviewCard variables={mockVariables} className="custom-preview" />
    );

    expect(container.firstChild).toHaveClass("custom-preview");
  });
});
