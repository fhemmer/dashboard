import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock environment variables before any modules are imported
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_PROJECT_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-key",
    NEXT_PUBLIC_SITE_URL: "http://localhost:5001",
  },
  getServerEnv: vi.fn(() => ({
    SUPABASE_SECRET_SERVICE_ROLE_KEY: "test-secret",
    UPSTASH_REDIS_REST_URL: "https://test.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "test-token",
    RESEND_API_KEY: "re_test_key",
  })),
}));

// Polyfill ResizeObserver for Radix UI components (required by @radix-ui/react-slider)
if (typeof ResizeObserver === "undefined") {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
}

// Polyfill scrollIntoView for Radix UI components (not available in JSDOM)
// Guard for Node environment tests that don't have Element
if (typeof Element !== "undefined") {
  Element.prototype.scrollIntoView = vi.fn();
}

// Mock window.matchMedia for responsive hooks
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Global mocks for Supabase
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
      })),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: {} }, error: null }),
        getSession: vi
          .fn()
          .mockResolvedValue({ data: { session: {} }, error: null }),
      },
    })
  ),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  })),
}));
