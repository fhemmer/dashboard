/**
 * Pricing Page
 * Displays subscription tiers and handles checkout
 */

import { Check, Sparkles, Zap } from "lucide-react";
import { Metadata } from "next";

import { getSubscription, TIER_CREDITS, TIER_NAMES, TIER_PRICING, type SubscriptionTier } from "@/lib/subscription";

import { PricingCard } from "./components/pricing-card";

export const metadata: Metadata = {
  title: "Pricing | Dashboard",
  description: "Choose the plan that fits your needs",
};

const FEATURES = {
  free: [
    "Access to free AI models",
    "Llama 3.3, DeepSeek R1:free, Gemini Flash",
    "$1.00/month AI credit",
    "7-day trial with $10 credit",
    "Basic support",
  ],
  pro: [
    "Everything in Free",
    "Access to ALL AI models",
    "Claude, GPT-4o, o3-mini, Gemini Pro",
    "$15.00/month AI credit",
    "Priority support",
  ],
  pro_plus: [
    "Everything in Pro",
    "Access to ALL AI models",
    "Higher rate limits",
    "$35.00/month AI credit",
    "Premium support",
    "Early access to new features",
  ],
} as const;

const ICONS = {
  free: Sparkles,
  pro: Zap,
  pro_plus: Check,
} as const;

export default async function PricingPage() {
  const subscription = await getSubscription();
  const currentTier = subscription?.tier ?? "free";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Get access to powerful AI models with flexible monthly credits.
          Credits reset each month and don&apos;t roll over.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {(["free", "pro", "pro_plus"] as SubscriptionTier[]).map((tier) => (
          <PricingCard
            key={tier}
            tier={tier}
            name={TIER_NAMES[tier]}
            price={TIER_PRICING[tier]}
            credits={TIER_CREDITS[tier] / 100}
            features={FEATURES[tier]}
            icon={ICONS[tier]}
            isCurrentPlan={currentTier === tier}
            isPopular={tier === "pro"}
          />
        ))}
      </div>

      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>All plans include access to free AI models (Llama, DeepSeek:free, Gemini Flash:free)</p>
        <p className="mt-2">
          Prices are in USD and charged monthly. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
