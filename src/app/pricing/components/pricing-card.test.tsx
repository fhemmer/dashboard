import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Sparkles } from "lucide-react";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { PricingCard } from "./pricing-card";

describe("PricingCard", () => {
  const defaultProps = {
    tier: "pro" as const,
    name: "Pro",
    price: 10,
    credits: 15,
    features: ["Feature 1", "Feature 2", "Feature 3"],
    icon: Sparkles,
    isCurrentPlan: false,
    isPopular: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders card with tier info", () => {
    render(<PricingCard {...defaultProps} />);

    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("$10")).toBeInTheDocument();
    expect(screen.getByText("/month")).toBeInTheDocument();
    expect(screen.getByText("$15.00")).toBeInTheDocument();
    expect(screen.getByText("Feature 1")).toBeInTheDocument();
    expect(screen.getByText("Feature 2")).toBeInTheDocument();
    expect(screen.getByText("Feature 3")).toBeInTheDocument();
  });

  it("shows Most Popular badge when isPopular is true", () => {
    render(<PricingCard {...defaultProps} isPopular />);

    expect(screen.getByText("Most Popular")).toBeInTheDocument();
  });

  it("shows Current Plan badge when isCurrentPlan is true", () => {
    render(<PricingCard {...defaultProps} isCurrentPlan />);

    // Current Plan appears in badge and button
    expect(screen.getAllByText("Current Plan")).toHaveLength(2);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("disables button for current plan", () => {
    render(<PricingCard {...defaultProps} isCurrentPlan />);

    expect(screen.getByRole("button", { name: /current plan/i })).toBeDisabled();
  });

  it("shows Get Started button for free tier", () => {
    render(<PricingCard {...defaultProps} tier="free" name="Free" />);

    expect(screen.getByRole("button", { name: /get started/i })).toBeInTheDocument();
  });

  it("shows Upgrade to button for paid tiers", () => {
    render(<PricingCard {...defaultProps} tier="pro" name="Pro" />);

    expect(screen.getByRole("button", { name: /upgrade to pro/i })).toBeInTheDocument();
  });

  it("does not trigger checkout for free tier", async () => {
    render(<PricingCard {...defaultProps} tier="free" name="Free" />);

    fireEvent.click(screen.getByRole("button", { name: /get started/i }));

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("triggers checkout for paid tier", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ url: "https://checkout.stripe.com/session" }),
    });

    render(<PricingCard {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /upgrade to pro/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "pro" }),
      });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("https://checkout.stripe.com/session");
    });
  });

  it("shows loading state during checkout", async () => {
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockFetch.mockReturnValueOnce(promise);

    render(<PricingCard {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /upgrade to pro/i }));

    expect(screen.getByRole("button", { name: /processing/i })).toBeDisabled();

    resolvePromise!({
      json: () => Promise.resolve({ url: "https://checkout.stripe.com/session" }),
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /upgrade to pro/i })).toBeInTheDocument();
    });
  });

  it("handles checkout error response", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ error: "Checkout failed" }),
    });

    render(<PricingCard {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /upgrade to pro/i }));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Checkout error:", "Checkout failed");
    });

    expect(mockPush).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("handles fetch error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<PricingCard {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /upgrade to pro/i }));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Checkout error:", expect.any(Error));
    });

    expect(mockPush).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("re-enables button after error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<PricingCard {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /upgrade to pro/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /upgrade to pro/i })).not.toBeDisabled();
    });

    consoleSpy.mockRestore();
  });

  it("applies correct styles for popular card", () => {
    const { container } = render(<PricingCard {...defaultProps} isPopular />);

    const card = container.querySelector("[class*='border-primary']");
    expect(card).toBeInTheDocument();
  });

  it("applies correct styles for current plan card", () => {
    const { container } = render(<PricingCard {...defaultProps} isCurrentPlan />);

    const card = container.querySelector("[class*='border-green-500']");
    expect(card).toBeInTheDocument();
  });
});
