"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import { updateSystemSetting } from "../actions";

interface AdminSettingsFormProps {
  fetchIntervalMinutes: number;
  notificationRetentionDays: number;
  lastFetchAt: string | null;
}

export function AdminSettingsForm({
  fetchIntervalMinutes: initialFetchInterval,
  notificationRetentionDays: initialRetentionDays,
  lastFetchAt,
}: AdminSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [fetchInterval, setFetchInterval] = useState(initialFetchInterval);
  const [retentionDays, setRetentionDays] = useState(initialRetentionDays);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveSuccess(false);
    setError(null);

    startTransition(async () => {
      const results = await Promise.all([
        updateSystemSetting("fetch_interval_minutes", fetchInterval),
        updateSystemSetting("notification_retention_days", retentionDays),
      ]);

      const failed = results.find((r) => !r.success);
      if (failed) {
        setError(failed.error ?? "Failed to save settings");
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    });
  };

  const formatLastFetch = (timestamp: string | null) => {
    if (!timestamp || timestamp === "null") return "Never";
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "Never";
      return date.toLocaleString();
    } catch {
      return "Never";
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      data-testid="admin-settings-form"
    >
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {saveSuccess && (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
          <Check className="h-4 w-4" />
          Settings saved successfully.
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="fetchInterval" className="text-sm font-medium">
          Fetch Interval (minutes)
        </label>
        <Input
          id="fetchInterval"
          type="number"
          min={5}
          max={1440}
          value={fetchInterval}
          onChange={(e) => setFetchInterval(Number(e.target.value))}
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">
          How often the news fetcher script should run (5-1440 minutes).
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="retentionDays" className="text-sm font-medium">
          Notification Retention (days)
        </label>
        <Input
          id="retentionDays"
          type="number"
          min={1}
          max={365}
          value={retentionDays}
          onChange={(e) => setRetentionDays(Number(e.target.value))}
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">
          Notifications older than this will be automatically deleted (1-365 days).
        </p>
      </div>

      <div className="pt-2 border-t">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">Last fetch:</span>{" "}
          {formatLastFetch(lastFetchAt)}
        </p>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  );
}
