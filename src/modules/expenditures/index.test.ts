import { describe, expect, it } from "vitest";
import * as expendituresExports from "./index";

describe("expenditures index barrel", () => {
  it("exports getExpenditures", () => {
    expect(expendituresExports.getExpenditures).toBeDefined();
  });

  it("exports createExpenditureSource", () => {
    expect(expendituresExports.createExpenditureSource).toBeDefined();
  });

  it("exports updateExpenditureSource", () => {
    expect(expendituresExports.updateExpenditureSource).toBeDefined();
  });

  it("exports deleteExpenditureSource", () => {
    expect(expendituresExports.deleteExpenditureSource).toBeDefined();
  });

  it("exports updateConsumptionCost", () => {
    expect(expendituresExports.updateConsumptionCost).toBeDefined();
  });

  it("exports ExpendituresWidget", () => {
    expect(expendituresExports.ExpendituresWidget).toBeDefined();
  });

  it("exports formatCurrency", () => {
    expect(expendituresExports.formatCurrency).toBeDefined();
  });

  it("exports formatBillingCycle", () => {
    expect(expendituresExports.formatBillingCycle).toBeDefined();
  });

  it("exports calculateTotalCost", () => {
    expect(expendituresExports.calculateTotalCost).toBeDefined();
  });

  it("exports calculateNextBillingDate", () => {
    expect(expendituresExports.calculateNextBillingDate).toBeDefined();
  });
});
