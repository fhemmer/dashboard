"use client";

/**
 * Manage Subscription Button
 * Opens Stripe Customer Portal for subscription management
 */

import { Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function ManageSubscriptionButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleManage() {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await response.json();
      if (data.url) {
        router.push(data.url);
      } else {
        console.error("Portal error:", data.error);
      }
    } catch (error) {
      console.error("Portal error:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleManage}
      disabled={loading}
    >
      <Settings className="h-4 w-4 mr-2" />
      {loading ? "Loading..." : "Manage"}
    </Button>
  );
}
