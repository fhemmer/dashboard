/**
 * Transaction History Component
 * Displays credit transactions
 */

import { formatDistanceToNow } from "date-fns";

import { formatCredits, type CreditTransaction } from "@/lib/credits";
import { cn } from "@/lib/utils";

interface TransactionHistoryProps {
  transactions: CreditTransaction[];
}

const REASON_LABELS: Record<string, string> = {
  trial_credit: "Trial Credit",
  monthly_credit: "Monthly Credit",
  subscription_upgrade: "Plan Upgrade",
  subscription_canceled_free_credit: "Subscription Ended",
  trial_ended_free_credit: "Trial Ended",
  ai_usage: "AI Usage",
};

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  if (transactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No transactions yet
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="flex items-center justify-between py-2 border-b last:border-0"
        >
          <div>
            <p className="text-sm font-medium">
              {REASON_LABELS[tx.reason] ?? tx.reason}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(tx.createdAt, { addSuffix: true })}
            </p>
          </div>
          <p
            className={cn(
              "text-sm font-mono font-medium",
              tx.amountCents > 0 ? "text-green-600" : "text-red-600"
            )}
          >
            {tx.amountCents > 0 ? "+" : ""}
            {formatCredits(tx.amountCents)}
          </p>
        </div>
      ))}
    </div>
  );
}
