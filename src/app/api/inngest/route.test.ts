import { describe, expect, it, vi } from "vitest";

// Mock inngest/next serve function
vi.mock("inngest/next", () => ({
  serve: vi.fn(() => ({
    GET: vi.fn(),
    POST: vi.fn(),
    PUT: vi.fn(),
  })),
}));

// Mock inngest client and functions
vi.mock("@/inngest", () => ({
  inngest: { id: "test-inngest" },
  allFunctions: [{ name: "testFunction" }],
}));

import { serve } from "inngest/next";
import { GET, POST, PUT } from "./route";

describe("Inngest Route", () => {
  it("exports GET handler from serve", () => {
    expect(GET).toBeDefined();
    expect(typeof GET).toBe("function");
  });

  it("exports POST handler from serve", () => {
    expect(POST).toBeDefined();
    expect(typeof POST).toBe("function");
  });

  it("exports PUT handler from serve", () => {
    expect(PUT).toBeDefined();
    expect(typeof PUT).toBe("function");
  });

  it("calls serve with inngest client and functions", async () => {
    // Re-import to trigger the serve call
    await import("./route");

    expect(serve).toHaveBeenCalledWith({
      client: { id: "test-inngest" },
      functions: [{ name: "testFunction" }],
    });
  });
});
