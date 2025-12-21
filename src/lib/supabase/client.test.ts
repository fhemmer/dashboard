import { beforeEach, describe, expect, it, vi } from "vitest";

// Clear global mocks and create fresh ones for this test
vi.unmock("@/lib/supabase/client");

const mockCreateBrowserClient = vi.fn(() => ({
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signOut: vi.fn(),
  },
}));

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: (url: string, key: string) => mockCreateBrowserClient(url, key),
}));

vi.mock("../env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_PROJECT_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
  },
}));

describe("createClient (browser)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a browser client that can be used", async () => {
    // Dynamic import to ensure fresh module
    const { createClient } = await import("./client");
    const client = createClient();

    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-publishable-key"
    );
  });
});
