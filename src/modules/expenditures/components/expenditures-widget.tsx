import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, Wallet } from "lucide-react";
import Link from "next/link";
import { getExpenditures, isCurrentUserAdmin } from "../actions";
import {
    calculateMonthlyCost,
    calculateNextBillingDate,
    calculateTotalCost,
    ExpenditureSource,
    formatCurrency,
} from "../types";

function findNextExpenditure(
  sources: ExpenditureSource[]
): { source: ExpenditureSource; date: Date } | null {
  if (sources.length === 0) return null;

  let earliest: { source: ExpenditureSource; date: Date } | null = null;

  for (const source of sources) {
    const nextDate = calculateNextBillingDate(source);
    if (!earliest || nextDate < earliest.date) {
      earliest = { source, date: nextDate };
    }
  }

  return earliest;
}

function calculateAverageMonthly(sources: ExpenditureSource[]): number {
  return sources.reduce((sum, s) => sum + calculateMonthlyCost(s), 0);
}

export async function ExpendituresWidget() {
  const isAdmin = await isCurrentUserAdmin();

  if (!isAdmin) {
    return null;
  }

  const { sources, error } = await getExpenditures();

  const nextExpenditure = findNextExpenditure(sources);
  const avgMonthly = calculateAverageMonthly(sources);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-start gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground mt-1" />
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Expenditures</CardTitle>
              {sources.length > 0 && (
                <Badge variant="secondary" className="text-xs tabular-nums">
                  {sources.length}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Subscriptions & consumption costs
            </CardDescription>
          </div>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/expenditures">View All</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive mb-4">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        {sources.length === 0 && !error ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              No expenditure sources configured
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/expenditures">Add Source</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Next expenditure:</div>
                <div className="text-sm font-medium">
                  {nextExpenditure?.source.name},{" "}
                  {nextExpenditure?.date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  ({nextExpenditure && formatCurrency(calculateTotalCost(nextExpenditure.source))})
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Avg.exp./mo</div>
                <div className="text-lg font-bold">{formatCurrency(avgMonthly)}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
