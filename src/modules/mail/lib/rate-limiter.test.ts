import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    checkRateLimit,
    cleanupRateLimits,
    resetRateLimit,
} from "./rate-limiter";

describe("rate limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset the rate limiter state before each test
    cleanupRateLimits();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("checkRateLimit", () => {
    it("should allow first request for a key", () => {
      const result = checkRateLimit("test-key");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29); // 30 max - 1 = 29
    });

    it("should decrement remaining on each request", () => {
      const result1 = checkRateLimit("decrement-key");
      const result2 = checkRateLimit("decrement-key");
      const result3 = checkRateLimit("decrement-key");

      expect(result1.remaining).toBe(29);
      expect(result2.remaining).toBe(28);
      expect(result3.remaining).toBe(27);
    });

    it("should block when limit is exceeded", () => {
      // Make 30 requests to exhaust the limit
      for (let i = 0; i < 30; i++) {
        checkRateLimit("exhausted-key");
      }

      const result = checkRateLimit("exhausted-key");

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should allow requests after window expires", () => {
      // Make some requests
      checkRateLimit("expiry-key");
      checkRateLimit("expiry-key");

      // Advance time beyond the window (1 minute)
      vi.advanceTimersByTime(61 * 1000);

      const result = checkRateLimit("expiry-key");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29); // Reset to max - 1
    });

    it("should track different keys independently", () => {
      checkRateLimit("key-a");
      checkRateLimit("key-a");
      checkRateLimit("key-a");

      const resultA = checkRateLimit("key-a");
      const resultB = checkRateLimit("key-b");

      expect(resultA.remaining).toBe(26); // 30 - 4
      expect(resultB.remaining).toBe(29); // Fresh key, 30 - 1
    });

    it("should clean up expired entries when map is large", () => {
      // Create many entries (more than MAX_ENTRIES threshold)
      for (let i = 0; i < 10001; i++) {
        checkRateLimit(`key-${i}`);
      }

      // Advance time to expire all entries
      vi.advanceTimersByTime(61 * 1000);

      // This should trigger cleanup
      const result = checkRateLimit("new-key");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29);
    });
  });

  describe("resetRateLimit", () => {
    it("should reset limit for a specific key", () => {
      // Exhaust the limit
      for (let i = 0; i < 30; i++) {
        checkRateLimit("reset-key");
      }

      // Verify it's blocked
      expect(checkRateLimit("reset-key").allowed).toBe(false);

      // Reset and verify it's allowed again
      resetRateLimit("reset-key");
      const result = checkRateLimit("reset-key");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29);
    });

    it("should not affect other keys when resetting one", () => {
      checkRateLimit("keep-key");
      checkRateLimit("keep-key");
      checkRateLimit("reset-me");

      resetRateLimit("reset-me");

      const keepResult = checkRateLimit("keep-key");
      const resetResult = checkRateLimit("reset-me");

      expect(keepResult.remaining).toBe(27); // 30 - 3
      expect(resetResult.remaining).toBe(29); // Reset, 30 - 1
    });
  });

  describe("cleanupRateLimits", () => {
    it("should clean up all expired entries", () => {
      // Create some entries
      checkRateLimit("cleanup-1");
      checkRateLimit("cleanup-2");

      // Advance time to expire them
      vi.advanceTimersByTime(61 * 1000);

      // Manually trigger cleanup
      cleanupRateLimits();

      // New requests should have full limit available
      const result = checkRateLimit("cleanup-1");
      expect(result.remaining).toBe(29);
    });
  });
});
