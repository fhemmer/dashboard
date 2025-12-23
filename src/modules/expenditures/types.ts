export type BillingCycle = "monthly" | "yearly";

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function getMonthName(month: number | null): string {
  if (month === null || month < 1 || month > 12) return "";
  return MONTH_NAMES[month - 1];
}

export interface ExpenditureSource {
  id: string;
  userId: string;
  name: string;
  baseCost: number;
  billingCycle: BillingCycle;
  billingDayOfMonth: number;
  billingMonth: number | null;
  consumptionCost: number;
  detailsUrl: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenditureSourceInput {
  name: string;
  baseCost: number;
  billingCycle: BillingCycle;
  billingDayOfMonth: number;
  billingMonth?: number | null;
  consumptionCost?: number;
  detailsUrl?: string | null;
  notes?: string | null;
}

export interface FetchExpendituresResult {
  sources: ExpenditureSource[];
  error?: string;
}

export interface UpdateResult {
  success: boolean;
  error?: string;
}

export function calculateTotalCost(source: ExpenditureSource): number {
  return source.baseCost + source.consumptionCost;
}

export function calculateMonthlyCost(source: ExpenditureSource): number {
  const total = calculateTotalCost(source);
  return source.billingCycle === "yearly" ? total / 12 : total;
}

export function calculateNextBillingDate(source: ExpenditureSource): Date {
  const now = new Date();
  const currentDay = now.getDate();
  const billingDay = source.billingDayOfMonth;

  let nextBilling: Date;

  if (source.billingCycle === "yearly") {
    // For yearly, use the stored billing month (0-indexed for Date constructor)
    const billingMonthIndex = (source.billingMonth ?? 1) - 1;
    nextBilling = new Date(now.getFullYear(), billingMonthIndex, billingDay);
    if (nextBilling <= now) {
      nextBilling = new Date(now.getFullYear() + 1, billingMonthIndex, billingDay);
    }
  } else if (currentDay < billingDay) {
    // Billing day is later this month
    nextBilling = new Date(now.getFullYear(), now.getMonth(), billingDay);
  } else {
    // Billing day has passed, next month
    nextBilling = new Date(now.getFullYear(), now.getMonth() + 1, billingDay);
  }

  return nextBilling;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatBillingCycle(cycle: BillingCycle): string {
  return cycle === "monthly" ? "/mo" : "/yr";
}
