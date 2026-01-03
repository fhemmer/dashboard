"use client";

/**
 * Pricing Card Component
 * Displays a single pricing tier with checkout action
 */

import { type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SubscriptionTier } from "@/lib/subscription";

function ButtonLabel({ loading, isCurrentPlan, tier, name }: { loading: boolean; isCurrentPlan: boolean; tier: SubscriptionTier; name: string }) {
  if (loading) return "Processing...";
  if (isCurrentPlan) return "Current Plan";
  if (tier === "free") return "Get Started";
  return `Upgrade to ${name}`;
}

interface PricingCardProps {
  tier: SubscriptionTier;
  name: string;
  price: number;
  credits: number;
  features: readonly string[];
  icon: LucideIcon;
  isCurrentPlan: boolean;
  isPopular?: boolean;
}

export function PricingCard({
  tier,
  name,
  price,
  credits,
  features,
  icon: Icon,
  isCurrentPlan,
  isPopular,
}: PricingCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    if (tier === "free" || isCurrentPlan) return;

    setLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      const data = await response.json();
      if (data.url) {
        router.push(data.url);
      } else {
        console.error("Checkout error:", data.error);
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      className={cn(
        "relative flex flex-col",
        isPopular && "border-primary shadow-lg scale-105",
        isCurrentPlan && "border-green-500"
      )}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
            Current Plan
          </span>
        </div>
      )}

      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">{name}</CardTitle>
        <CardDescription>
          <span className="text-4xl font-bold text-foreground">${price}</span>
          <span className="text-muted-foreground">/month</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="mb-4 text-center">
          <span className="text-lg font-semibold text-primary">
            ${credits.toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground"> AI credit/month</span>
        </div>

        <ul className="space-y-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          variant={isPopular ? "default" : "outline"}
          disabled={isCurrentPlan || loading}
          onClick={handleCheckout}
        >
          <ButtonLabel loading={loading} isCurrentPlan={isCurrentPlan} tier={tier} name={name} />
        </Button>
      </CardFooter>
    </Card>
  );
}
