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
import { Check, Loader2, Pencil, X } from "lucide-react";
import { useState, useTransition } from "react";
import { updateExpenditureSource } from "../actions";
import type { BillingCycle, ExpenditureSource } from "../types";
import { formatBillingCycle, formatCurrency, getMonthName, MONTH_NAMES } from "../types";

interface ExpenditureItemProps {
  readonly source: ExpenditureSource;
}

export function ExpenditureItem({ source }: ExpenditureItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(source.name);
  const [baseCost, setBaseCost] = useState(source.baseCost.toString());
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(source.billingCycle);
  const [billingDay, setBillingDay] = useState(source.billingDayOfMonth.toString());
  const [billingMonth, setBillingMonth] = useState<string>(
    source.billingMonth?.toString() ?? ""
  );
  const [consumptionCost, setConsumptionCost] = useState(
    source.consumptionCost.toString()
  );
  const [detailsUrl, setDetailsUrl] = useState(source.detailsUrl ?? "");
  const [notes, setNotes] = useState(source.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateExpenditureSource(source.id, {
        name,
        baseCost: Number.parseFloat(baseCost) || 0,
        billingCycle,
        billingDayOfMonth: Number.parseInt(billingDay, 10) || 1,
        billingMonth: billingCycle === "yearly" && billingMonth ? Number.parseInt(billingMonth, 10) : null,
        consumptionCost: Number.parseFloat(consumptionCost) || 0,
        detailsUrl: detailsUrl || null,
        notes: notes || null,
      });

      if (result.success) {
        setIsEditing(false);
      } else {
        setError(result.error ?? "Failed to update");
      }
    });
  };

  const handleCancel = () => {
    setName(source.name);
    setBaseCost(source.baseCost.toString());
    setBillingCycle(source.billingCycle);
    setBillingDay(source.billingDayOfMonth.toString());
    setBillingMonth(source.billingMonth?.toString() ?? "");
    setConsumptionCost(source.consumptionCost.toString());
    setDetailsUrl(source.detailsUrl ?? "");
    setNotes(source.notes ?? "");
    setError(null);
    setIsEditing(false);
  };

  const total = (Number.parseFloat(baseCost) || 0) + (Number.parseFloat(consumptionCost) || 0);

  if (isEditing) {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`name-${source.id}`}>Name</Label>
            <Input
              id={`name-${source.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Service name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`details-${source.id}`}>Details URL</Label>
            <Input
              id={`details-${source.id}`}
              type="url"
              value={detailsUrl}
              onChange={(e) => setDetailsUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`notes-${source.id}`}>Notes</Label>
          <Input
            id={`notes-${source.id}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes or comments"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor={`base-${source.id}`}>Base Cost ($)</Label>
            <Input
              id={`base-${source.id}`}
              type="number"
              step="0.01"
              min="0"
              value={baseCost}
              onChange={(e) => setBaseCost(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`cycle-${source.id}`}>Billing Cycle</Label>
            <Select value={billingCycle} onValueChange={(v: BillingCycle) => {
              setBillingCycle(v);
              if (v === "monthly") {
                setBillingMonth("");
              }
            }}>
              <SelectTrigger id={`cycle-${source.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`day-${source.id}`}>Billing Day</Label>
            <Input
              id={`day-${source.id}`}
              type="number"
              min="1"
              max="28"
              value={billingDay}
              onChange={(e) => setBillingDay(e.target.value)}
            />
          </div>
          {billingCycle === "yearly" && (
            <div className="space-y-2">
              <Label htmlFor={`month-${source.id}`}>Billing Month</Label>
              <Select value={billingMonth} onValueChange={setBillingMonth}>
                <SelectTrigger id={`month-${source.id}`}>
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
            <Label htmlFor={`consumption-${source.id}`}>Consumption ($)</Label>
            <Input
              id={`consumption-${source.id}`}
              type="number"
              step="0.01"
              min="0"
              value={consumptionCost}
              onChange={(e) => setConsumptionCost(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isPending}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 flex items-center justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{source.name}</h3>
          {source.detailsUrl && (
            <a
              href={source.detailsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              View details
            </a>
          )}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          Base: {formatCurrency(source.baseCost)}
          {formatBillingCycle(source.billingCycle)}
          {source.billingCycle === "yearly" && source.billingMonth
            ? ` (${getMonthName(source.billingMonth)} ${source.billingDayOfMonth})`
            : ` (day ${source.billingDayOfMonth})`}
          {source.consumptionCost > 0 && (
            <span> · Consumption: {formatCurrency(source.consumptionCost)}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-lg font-semibold">
            {formatCurrency(source.baseCost + source.consumptionCost)}
          </div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
