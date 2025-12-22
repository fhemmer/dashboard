import { beforeEach, describe, expect, it, vi } from "vitest";

// Clear global mocks
vi.unmock("@/lib/supabase/server");

const mockCookieStore = {
  getAll: vi.fn(() => [{ name: "test-cookie", value: "test-value" }]),
  set: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const mockClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mock needs to accept any args from vi.mock
const mockCreateServerClient: any = vi.fn(() => mockClient);

vi.mock("@supabase/ssr", () => ({
  createServerClient: (url: string, key: string, options: unknown) =>
    mockCreateServerClient(url, key, options),
}));

vi.mock("../env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_PROJECT_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
  },
}));

describe("createClient (server)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a server client with correct configuration", async () => {
    const { createClient } = await import("./server");
    const client = await createClient();

    expect(client).toBeDefined();
    expect(mockCreateServerClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-publishable-key",
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      })
    );
  });

  it("cookie getAll returns cookies from store", async () => {
    const { createClient } = await import("./server");
    await createClient();

    // Get the cookie options that were passed
    const call = mockCreateServerClient.mock.calls[0] as unknown[];
    const cookieOptions = (call[2] as { cookies: { getAll: () => unknown } }).cookies;
    const result = cookieOptions.getAll();

    expect(result).toEqual([{ name: "test-cookie", value: "test-value" }]);
  });

  it("cookie setAll sets cookies in store", async () => {
    const { createClient } = await import("./server");
    await createClient();

    const call = mockCreateServerClient.mock.calls[0] as unknown[];
    const cookieOptions = (call[2] as { cookies: { setAll: (cookies: unknown[]) => void } }).cookies;
    cookieOptions.setAll([
      { name: "cookie1", value: "value1", options: { httpOnly: true } },
    ]);

    expect(mockCookieStore.set).toHaveBeenCalledWith("cookie1", "value1", {
      httpOnly: true,
    });
  });

  it("setAll handles errors gracefully", async () => {
    mockCookieStore.set.mockImplementationOnce(() => {
      throw new Error("Cannot set cookie in Server Component");
    });

    const { createClient } = await import("./server");
    await createClient();

    const call = mockCreateServerClient.mock.calls[0] as unknown[];
    const cookieOptions = (call[2] as { cookies: { setAll: (cookies: unknown[]) => void } }).cookies;

    // Should not throw
    expect(() => {
      cookieOptions.setAll([{ name: "fail", value: "value", options: {} }]);
    }).not.toThrow();
  });
});
