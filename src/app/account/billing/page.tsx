/**
 * Account Billing Page
 * Shows subscription status, credits, and usage history
 */

import { ArrowRight, CreditCard, History, Sparkles } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCredits, getCreditsInfo, getCreditTransactions } from "@/lib/credits";
import { getSubscription, TIER_CREDITS, TIER_NAMES, type SubscriptionTier } from "@/lib/subscription";

import { ManageSubscriptionButton } from "./components/manage-subscription-button";
import { TransactionHistory } from "./components/transaction-history";

export const metadata: Metadata = {
  title: "Billing | Dashboard",
  description: "Manage your subscription and view usage",
};

function getSubscriptionStatusText(status: string | undefined, daysUntilTrialEnds: number | null | undefined): string {
  if (status === "trialing" && daysUntilTrialEnds) {
    return `Trial ends in ${daysUntilTrialEnds} days`;
  }
  if (status === "active") {
    return "Active subscription";
  }
  return "Free tier";
}

export default async function BillingPage() {
  const [subscription, creditsInfo, transactions] = await Promise.all([
    getSubscription(),
    getCreditsInfo(),
    getCreditTransactions(10),
  ]);

  const tier = (subscription?.tier ?? "free") as SubscriptionTier;
  const tierName = TIER_NAMES[tier];
  const monthlyAllowance = TIER_CREDITS[tier];
  const creditsUsed = monthlyAllowance - (creditsInfo?.balanceCents ?? 0);
  const usagePercent = Math.min(100, Math.max(0, (creditsUsed / monthlyAllowance) * 100));

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Billing & Usage</h1>

      <div className="grid gap-6">
        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Plan
            </CardTitle>
            <CardDescription>
              Your subscription and billing details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{tierName}</p>
                <p className="text-sm text-muted-foreground">
                  {getSubscriptionStatusText(subscription?.status, creditsInfo?.daysUntilTrialEnds)}
                </p>
              </div>
              <div className="flex gap-2">
                {tier !== "free" && (
                  <ManageSubscriptionButton />
                )}
                <Button asChild variant="outline">
                  <Link href="/pricing">
                    {tier === "free" ? "Upgrade" : "Change Plan"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Credits
            </CardTitle>
            <CardDescription>
              Your monthly AI usage allowance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">
                  {formatCredits(creditsInfo?.balanceCents ?? 0)}
                </p>
                <p className="text-sm text-muted-foreground">
                  of {formatCredits(monthlyAllowance)} remaining
                </p>
              </div>
              {creditsInfo?.isTrialActive && (
                <div className="text-right">
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-500">
                    Trial Active
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {creditsInfo.daysUntilTrialEnds} days left
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Progress value={100 - usagePercent} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">
                {formatCredits(creditsUsed)} used this month
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-medium mb-1">How credits work:</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• Credits reset on your billing date each month</li>
                <li>• Unused credits do not roll over</li>
                <li>• Free models are always available, even with $0 credits</li>
                <li>• Paid models require credits to use</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Your credit transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TransactionHistory transactions={transactions} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
