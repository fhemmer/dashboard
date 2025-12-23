import { createClient } from "@/lib/supabase/server";
import { getExpenditures } from "@/modules/expenditures";
import { calculateMonthlyCost, formatCurrency } from "@/modules/expenditures/types";
import { Wallet } from "lucide-react";
import { redirect } from "next/navigation";
import { AddExpenditureForm } from "../../modules/expenditures/components/add-expenditure-form";
import { ExpenditureItem } from "../../modules/expenditures/components/expenditure-item";

export default async function ExpendituresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { sources, error } = await getExpenditures();
  const monthlyTotal = sources.reduce((sum, s) => sum + calculateMonthlyCost(s), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wallet className="h-8 w-8 text-muted-foreground" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Expenditures</h1>
            <p className="text-muted-foreground">
              Track your subscriptions and consumption-based costs
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{formatCurrency(monthlyTotal)}</div>
          <div className="text-sm text-muted-foreground">Est. Monthly Total</div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive font-medium">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {sources.map((source) => (
          <ExpenditureItem key={source.id} source={source} />
        ))}

        {sources.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border bg-card">
            <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No expenditure sources</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Add your first subscription or consumption-based service to start
              tracking costs.
            </p>
          </div>
        )}

        <AddExpenditureForm />
      </div>
    </div>
  );
}
