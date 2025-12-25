"use client";

import type { Timer } from "@/modules/timers";
import { getTimers } from "@/modules/timers";
import { CreateTimerDialog } from "@/modules/timers/components/create-timer-dialog";
import { TimerAlertProvider } from "@/modules/timers/components/timer-alert-provider";
import { TimerCard } from "@/modules/timers/components/timer-card";
import { Timer as TimerIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function TimersPage() {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const router = useRouter();

  const loadTimers = useCallback(async () => {
    const result = await getTimers();
    if (result.error) {
      setError(result.error);
    } else {
      setError(undefined); // Clear error on success
      setTimers(result.timers);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTimers();
  }, [loadTimers]);

  const handleUpdate = () => {
    router.refresh();
    loadTimers();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-muted-foreground">Loading timers...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TimerIcon className="h-8 w-8 text-muted-foreground" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Timers</h1>
            <p className="text-muted-foreground">
              Countdown timers with audio and browser notifications
            </p>
          </div>
        </div>
      </div>

      <TimerAlertProvider />

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive font-medium">{error}</p>
        </div>
      )}

      {timers.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border bg-card">
          <TimerIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No timers yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Create your first countdown timer to get started. Perfect for
            pomodoro sessions, breaks, or time-boxing tasks.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {timers.map((timer) => (
          <TimerCard key={timer.id} timer={timer} onUpdate={handleUpdate} />
        ))}
      </div>

      <div className="max-w-sm">
        <CreateTimerDialog onCreated={handleUpdate} />
      </div>
    </div>
  );
}
