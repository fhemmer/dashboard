import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

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

import { ManageSubscriptionButton } from "./manage-subscription-button";

describe("ManageSubscriptionButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the manage button", () => {
    render(<ManageSubscriptionButton />);
    
    expect(screen.getByRole("button", { name: /manage/i })).toBeInTheDocument();
  });

  it("navigates to portal URL on successful fetch", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ url: "https://portal.stripe.com/session" }),
    });

    render(<ManageSubscriptionButton />);
    
    fireEvent.click(screen.getByRole("button", { name: /manage/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("https://portal.stripe.com/session");
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/stripe/portal", {
      method: "POST",
    });
  });

  it("shows loading state while processing", async () => {
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockFetch.mockReturnValueOnce(promise);

    render(<ManageSubscriptionButton />);
    
    fireEvent.click(screen.getByRole("button", { name: /manage/i }));

    expect(screen.getByRole("button", { name: /loading/i })).toBeDisabled();

    resolvePromise!({
      json: () => Promise.resolve({ url: "https://portal.stripe.com/session" }),
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /manage/i })).toBeInTheDocument();
    });
  });

  it("handles error response from API", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ error: "Portal error" }),
    });

    render(<ManageSubscriptionButton />);
    
    fireEvent.click(screen.getByRole("button", { name: /manage/i }));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Portal error:", "Portal error");
    });

    expect(mockPush).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("handles fetch error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<ManageSubscriptionButton />);
    
    fireEvent.click(screen.getByRole("button", { name: /manage/i }));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Portal error:", expect.any(Error));
    });

    expect(mockPush).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("re-enables button after error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<ManageSubscriptionButton />);
    
    fireEvent.click(screen.getByRole("button", { name: /manage/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /manage/i })).not.toBeDisabled();
    });

    consoleSpy.mockRestore();
  });
});
