import { describe, expect, it, vi } from "vitest";
import type { BillingCycle, ExpenditureSource } from "./types";
import {
    calculateMonthlyCost,
    calculateNextBillingDate,
    calculateTotalCost,
    formatBillingCycle,
    formatCurrency,
    getMonthName,
    MONTH_NAMES,
} from "./types";

describe("expenditures types", () => {
  describe("MONTH_NAMES", () => {
    it("has 12 months", () => {
      expect(MONTH_NAMES).toHaveLength(12);
    });

    it("starts with January and ends with December", () => {
      expect(MONTH_NAMES[0]).toBe("January");
      expect(MONTH_NAMES[11]).toBe("December");
    });
  });

  describe("getMonthName", () => {
    it("returns correct month name for valid month numbers", () => {
      expect(getMonthName(1)).toBe("January");
      expect(getMonthName(6)).toBe("June");
      expect(getMonthName(12)).toBe("December");
    });

    it("returns empty string for null", () => {
      expect(getMonthName(null)).toBe("");
    });

    it("returns empty string for out of range values", () => {
      expect(getMonthName(0)).toBe("");
      expect(getMonthName(13)).toBe("");
      expect(getMonthName(-1)).toBe("");
    });
  });

  describe("calculateTotalCost", () => {
    it("adds baseCost and consumptionCost", () => {
      const source: ExpenditureSource = {
        id: "1",
        userId: "user-1",
        name: "AWS",
        baseCost: 100,
        billingCycle: "monthly",
        billingDayOfMonth: 15,
        billingMonth: null,
        consumptionCost: 50,
        detailsUrl: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(calculateTotalCost(source)).toBe(150);
    });

    it("handles zero consumptionCost", () => {
      const source: ExpenditureSource = {
        id: "1",
        userId: "user-1",
        name: "Azure",
        baseCost: 200,
        billingCycle: "yearly",
        billingDayOfMonth: 1,
        billingMonth: 6,
        consumptionCost: 0,
        detailsUrl: "https://azure.com",
        notes: "Test note",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(calculateTotalCost(source)).toBe(200);
    });

    it("handles zero baseCost", () => {
      const source: ExpenditureSource = {
        id: "1",
        userId: "user-1",
        name: "Pay-as-you-go",
        baseCost: 0,
        billingCycle: "monthly",
        billingDayOfMonth: 1,
        billingMonth: null,
        consumptionCost: 75.5,
        detailsUrl: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(calculateTotalCost(source)).toBe(75.5);
    });
  });

  describe("calculateMonthlyCost", () => {
    it("returns total cost for monthly billing", () => {
      const source: ExpenditureSource = {
        id: "1",
        userId: "user-1",
        name: "Netflix",
        baseCost: 15.99,
        billingCycle: "monthly",
        billingDayOfMonth: 1,
        billingMonth: null,
        consumptionCost: 0,
        detailsUrl: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(calculateMonthlyCost(source)).toBe(15.99);
    });

    it("divides yearly cost by 12", () => {
      const source: ExpenditureSource = {
        id: "1",
        userId: "user-1",
        name: "Annual Subscription",
        baseCost: 120,
        billingCycle: "yearly",
        billingDayOfMonth: 15,
        billingMonth: 6,
        consumptionCost: 0,
        detailsUrl: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(calculateMonthlyCost(source)).toBe(10);
    });

    it("includes consumption cost in yearly calculation", () => {
      const source: ExpenditureSource = {
        id: "1",
        userId: "user-1",
        name: "Annual with extras",
        baseCost: 100,
        billingCycle: "yearly",
        billingDayOfMonth: 1,
        billingMonth: 1,
        consumptionCost: 20,
        detailsUrl: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(calculateMonthlyCost(source)).toBe(10); // (100 + 20) / 12 = 10
    });
  });

  describe("calculateNextBillingDate", () => {
    it("returns same month if billing day has not passed", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 5, 10)); // June 10, 2024

      const source: ExpenditureSource = {
        id: "1",
        userId: "user-1",
        name: "Service",
        baseCost: 100,
        billingCycle: "monthly",
        billingDayOfMonth: 15,
        billingMonth: null,
        consumptionCost: 0,
        detailsUrl: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const nextBilling = calculateNextBillingDate(source);
      expect(nextBilling.getFullYear()).toBe(2024);
      expect(nextBilling.getMonth()).toBe(5); // June
      expect(nextBilling.getDate()).toBe(15);

      vi.useRealTimers();
    });

    it("returns next month if billing day has passed", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 5, 20)); // June 20, 2024

      const source: ExpenditureSource = {
        id: "1",
        userId: "user-1",
        name: "Service",
        baseCost: 100,
        billingCycle: "monthly",
        billingDayOfMonth: 15,
        billingMonth: null,
        consumptionCost: 0,
        detailsUrl: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const nextBilling = calculateNextBillingDate(source);
      expect(nextBilling.getFullYear()).toBe(2024);
      expect(nextBilling.getMonth()).toBe(6); // July
      expect(nextBilling.getDate()).toBe(15);

      vi.useRealTimers();
    });

    it("returns next month if billing day is today", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0)); // June 15, 2024 noon

      const source: ExpenditureSource = {
        id: "1",
        userId: "user-1",
        name: "Service",
        baseCost: 100,
        billingCycle: "monthly",
        billingDayOfMonth: 15,
        billingMonth: null,
        consumptionCost: 0,
        detailsUrl: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const nextBilling = calculateNextBillingDate(source);
      expect(nextBilling.getFullYear()).toBe(2024);
      expect(nextBilling.getMonth()).toBe(6); // July
      expect(nextBilling.getDate()).toBe(15);

      vi.useRealTimers();
    });

    it("handles year rollover for monthly billing", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 11, 20)); // December 20, 2024

      const source: ExpenditureSource = {
        id: "1",
        userId: "user-1",
        name: "Service",
        baseCost: 100,
        billingCycle: "monthly",
        billingDayOfMonth: 15,
        billingMonth: null,
        consumptionCost: 0,
        detailsUrl: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const nextBilling = calculateNextBillingDate(source);
      expect(nextBilling.getFullYear()).toBe(2025);
      expect(nextBilling.getMonth()).toBe(0); // January
      expect(nextBilling.getDate()).toBe(15);

      vi.useRealTimers();
    });

    it("returns same year for yearly billing if day has not passed", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 5, 10)); // June 10, 2024

      const source: ExpenditureSource = {
        id: "1",
        userId: "user-1",
        name: "Annual Service",
        baseCost: 1200,
        billingCycle: "yearly",
        billingDayOfMonth: 15,
        billingMonth: 6,
        consumptionCost: 0,
        detailsUrl: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const nextBilling = calculateNextBillingDate(source);
      expect(nextBilling.getFullYear()).toBe(2024);
      expect(nextBilling.getMonth()).toBe(5); // June
      expect(nextBilling.getDate()).toBe(15);

      vi.useRealTimers();
    });

    it("returns next year for yearly billing if day has passed", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 5, 20)); // June 20, 2024

      const source: ExpenditureSource = {
        id: "1",
        userId: "user-1",
        name: "Annual Service",
        baseCost: 1200,
        billingCycle: "yearly",
        billingDayOfMonth: 15,
        billingMonth: 6,
        consumptionCost: 0,
        detailsUrl: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const nextBilling = calculateNextBillingDate(source);
      expect(nextBilling.getFullYear()).toBe(2025);
      expect(nextBilling.getMonth()).toBe(5); // June
      expect(nextBilling.getDate()).toBe(15);

      vi.useRealTimers();
    });
  });

  describe("formatCurrency", () => {
    it("formats positive amounts correctly", () => {
      expect(formatCurrency(100)).toBe("$100.00");
    });

    it("formats amounts with cents", () => {
      expect(formatCurrency(99.99)).toBe("$99.99");
    });

    it("formats zero", () => {
      expect(formatCurrency(0)).toBe("$0.00");
    });

    it("formats large amounts with commas", () => {
      expect(formatCurrency(1234567.89)).toBe("$1,234,567.89");
    });

    it("rounds to two decimal places", () => {
      expect(formatCurrency(99.999)).toBe("$100.00");
    });
  });

  describe("formatBillingCycle", () => {
    it("formats monthly cycle", () => {
      const cycle: BillingCycle = "monthly";
      expect(formatBillingCycle(cycle)).toBe("/mo");
    });

    it("formats yearly cycle", () => {
      const cycle: BillingCycle = "yearly";
      expect(formatBillingCycle(cycle)).toBe("/yr");
    });
  });
});
