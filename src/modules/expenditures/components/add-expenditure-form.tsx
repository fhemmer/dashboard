"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { createExpenditureSource } from "../actions";
import type { BillingCycle } from "../types";
import { MONTH_NAMES } from "../types";

export function AddExpenditureForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [baseCost, setBaseCost] = useState("0");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [billingDay, setBillingDay] = useState("1");
  const [billingMonth, setBillingMonth] = useState<string>("");
  const [consumptionCost, setConsumptionCost] = useState("0");
  const [detailsUrl, setDetailsUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setBaseCost("0");
    setBillingCycle("monthly");
    setBillingDay("1");
    setBillingMonth("");
    setConsumptionCost("0");
    setDetailsUrl("");
    setNotes("");
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createExpenditureSource({
        name: name.trim(),
        baseCost: Number.parseFloat(baseCost) || 0,
        billingCycle,
        billingDayOfMonth: Number.parseInt(billingDay, 10) || 1,
        billingMonth: billingCycle === "yearly" && billingMonth ? Number.parseInt(billingMonth, 10) : null,
        consumptionCost: Number.parseFloat(consumptionCost) || 0,
        detailsUrl: detailsUrl.trim() || null,
        notes: notes.trim() || null,
      });

      if (result.success) {
        resetForm();
        setIsOpen(false);
      } else {
        setError(result.error ?? "Failed to create");
      }
    });
  };

  if (!isOpen) {
    return (
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Expenditure Source
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border bg-card p-4 space-y-4"
    >
      <h3 className="font-medium">Add New Expenditure Source</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="new-name">Name *</Label>
          <Input
            id="new-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., GitHub Copilot"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-details">Details URL</Label>
          <Input
            id="new-details"
            type="url"
            value={detailsUrl}
            onChange={(e) => setDetailsUrl(e.target.value)}
            placeholder="https://github.com/settings/billing/summary"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-notes">Notes</Label>
        <Input
          id="new-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes or comments"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2">
          <Label htmlFor="new-base">Base Cost ($)</Label>
          <Input
            id="new-base"
            type="number"
            step="0.01"
            min="0"
            value={baseCost}
            onChange={(e) => setBaseCost(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-cycle">Billing Cycle</Label>
          <Select value={billingCycle} onValueChange={(v: BillingCycle) => {
            setBillingCycle(v);
            if (v === "monthly") {
              setBillingMonth("");
            }
          }}>
            <SelectTrigger id="new-cycle">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-day">Billing Day</Label>
          <Input
            id="new-day"
            type="number"
            min="1"
            max="28"
            value={billingDay}
            onChange={(e) => setBillingDay(e.target.value)}
          />
        </div>
        {billingCycle === "yearly" && (
          <div className="space-y-2">
            <Label htmlFor="new-month">Billing Month</Label>
            <Select value={billingMonth} onValueChange={setBillingMonth}>
              <SelectTrigger id="new-month">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((month, index) => (
                  <SelectItem key={month} value={(index + 1).toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="new-consumption">Consumption ($)</Label>
          <Input
            id="new-consumption"
            type="number"
            step="0.01"
            min="0"
            value={consumptionCost}
            onChange={(e) => setConsumptionCost(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            resetForm();
            setIsOpen(false);
          }}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Add Source
        </Button>
      </div>
    </form>
  );
}
