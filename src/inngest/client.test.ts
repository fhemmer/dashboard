/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from "vitest";

// Mock Inngest as a class
vi.mock("inngest", () => ({
  Inngest: class MockInngest {
    id: string;
    createFunction = vi.fn();
    send = vi.fn();

    constructor(config: { id: string }) {
      this.id = config.id;
    }
  },
}));

describe("inngest client", () => {
  it("should create an Inngest client with correct config", async () => {
    const { inngest } = await import("./client");
    expect(inngest).toBeDefined();
    expect(inngest.id).toBe("dashboard");
  });
});
