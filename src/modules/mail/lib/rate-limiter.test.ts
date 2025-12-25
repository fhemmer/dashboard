import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, cleanupRateLimits, resetRateLimit } from "./rate-limiter";

describe("rate-limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset all rate limits before each test
    resetRateLimit("test-key");
    resetRateLimit("key-1");
    resetRateLimit("key-2");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("checkRateLimit", () => {
    it("should allow first request and set remaining to MAX - 1", () => {
      const result = checkRateLimit("test-key");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29); // MAX_REQUESTS_PER_MINUTE - 1
    });

    it("should allow multiple requests within limit", () => {
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit("test-key");
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(29 - i);
      }
    });

    it("should deny requests when limit is exceeded", () => {
      // Use up all 30 requests
      for (let i = 0; i < 30; i++) {
        checkRateLimit("test-key");
      }

      // 31st request should be denied
      const result = checkRateLimit("test-key");
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should reset limit after window expires", () => {
      // Use up all requests
      for (let i = 0; i < 30; i++) {
        checkRateLimit("test-key");
      }

      // Verify limit is exceeded
      expect(checkRateLimit("test-key").allowed).toBe(false);

      // Advance time past the window (1 minute)
      vi.advanceTimersByTime(61000);

      // Request should now be allowed
      const result = checkRateLimit("test-key");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29);
    });

    it("should track different keys independently", () => {
      // Use up limit for key-1
      for (let i = 0; i < 30; i++) {
        checkRateLimit("key-1");
      }

      // key-1 should be denied
      expect(checkRateLimit("key-1").allowed).toBe(false);

      // key-2 should still be allowed
      const result = checkRateLimit("key-2");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29);
    });

    it("should cleanup expired entries when map is large", () => {
      // Create many keys to trigger cleanup (> MAX_ENTRIES)
      for (let i = 0; i < 10001; i++) {
        checkRateLimit(`temp-key-${i}`);
      }

      // Advance time to expire all entries
      vi.advanceTimersByTime(61000);

      // New request should trigger cleanup and be allowed
      const result = checkRateLimit("new-key");
      expect(result.allowed).toBe(true);
    });
  });

  describe("resetRateLimit", () => {
    it("should reset rate limit for a key", () => {
      // Use up all requests
      for (let i = 0; i < 30; i++) {
        checkRateLimit("test-key");
      }

      expect(checkRateLimit("test-key").allowed).toBe(false);

      // Reset the key
      resetRateLimit("test-key");

      // Should be allowed again
      const result = checkRateLimit("test-key");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29);
    });

    it("should not affect other keys", () => {
      checkRateLimit("key-1");
      checkRateLimit("key-2");

      resetRateLimit("key-1");

      // key-1 starts fresh
      expect(checkRateLimit("key-1").remaining).toBe(29);

      // key-2 continues counting
      expect(checkRateLimit("key-2").remaining).toBe(28);
    });
  });

  describe("cleanupRateLimits", () => {
    it("should remove expired entries", () => {
      // Create some entries
      checkRateLimit("key-1");
      checkRateLimit("key-2");

      // Advance time past the window
      vi.advanceTimersByTime(61000);

      // Cleanup should remove expired entries
      cleanupRateLimits();

      // New requests should start fresh
      expect(checkRateLimit("key-1").remaining).toBe(29);
      expect(checkRateLimit("key-2").remaining).toBe(29);
    });

    it("should not remove active entries", () => {
      // Create an entry
      checkRateLimit("test-key");

      // Advance time but not past the window
      vi.advanceTimersByTime(30000);

      // Cleanup should not remove active entry
      cleanupRateLimits();

      // Should continue counting
      const result = checkRateLimit("test-key");
      expect(result.remaining).toBe(28);
    });
  });
});
