/**
 * Credits Module Tests
 */

import { describe, expect, it } from "vitest";

import { formatCredits, usdToCents } from "./credits";

describe("credits", () => {
  describe("formatCredits", () => {
    it("should format positive cents as dollars", () => {
      expect(formatCredits(100)).toBe("$1.00");
      expect(formatCredits(1500)).toBe("$15.00");
      expect(formatCredits(3500)).toBe("$35.00");
    });

    it("should format zero cents", () => {
      expect(formatCredits(0)).toBe("$0.00");
    });

    it("should format small amounts with cents", () => {
      expect(formatCredits(50)).toBe("$0.50");
      expect(formatCredits(1)).toBe("$0.01");
    });

    it("should format negative amounts (for transactions)", () => {
      expect(formatCredits(-100)).toBe("$-1.00");
      expect(formatCredits(-50)).toBe("$-0.50");
    });
  });

  describe("usdToCents", () => {
    it("should convert whole dollars to cents", () => {
      expect(usdToCents(1)).toBe(100);
      expect(usdToCents(10)).toBe(1000);
      expect(usdToCents(35)).toBe(3500);
    });

    it("should convert fractional dollars to cents", () => {
      expect(usdToCents(0.5)).toBe(50);
      expect(usdToCents(0.01)).toBe(1);
      expect(usdToCents(1.99)).toBe(199);
    });

    it("should round to nearest cent", () => {
      expect(usdToCents(0.001)).toBe(0);
      expect(usdToCents(0.005)).toBe(1); // rounds up
      expect(usdToCents(0.004)).toBe(0); // rounds down
    });

    it("should handle zero", () => {
      expect(usdToCents(0)).toBe(0);
    });
  });
});
