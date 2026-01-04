"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle2, Pause, Play, Timer as TimerIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getTimers } from "../actions";
import type { Timer, TimerState } from "../types";
import { calculateEndTime, formatEndTime, formatTime, getProgress } from "../types";

const MAX_VISIBLE_TIMERS = 4;

/** Priority order for sorting timers */
const STATE_PRIORITY: Record<TimerState, number> = {
  running: 0,
  paused: 1,
  stopped: 2,
  completed: 3,
};

function sortTimers(timers: Timer[]): Timer[] {
  return [...timers].sort((a, b) => {
    const priorityDiff = STATE_PRIORITY[a.state] - STATE_PRIORITY[b.state];
    if (priorityDiff !== 0) return priorityDiff;
    // Within same state, sort by remaining time (ascending)
    return a.remainingSeconds - b.remainingSeconds;
  });
}

function TimerStateIcon({ state }: { state: TimerState }) {
  switch (state) {
    case "running":
      return <Play className="h-3 w-3 text-green-500 fill-green-500" />;
    case "paused":
      return <Pause className="h-3 w-3 text-yellow-500" />;
    case "completed":
      return <CheckCircle2 className="h-3 w-3 text-muted-foreground" />;
    default:
      return <TimerIcon className="h-3 w-3 text-muted-foreground" />;
  }
}

interface TimerRowProps {
  timer: Timer;
  localRemaining: number;
}

function TimerRow({ timer, localRemaining }: TimerRowProps) {
  const progress = getProgress({ ...timer, remainingSeconds: localRemaining });
  const isCompleted = timer.state === "completed";
  const endTimeDisplay = timer.state === "running" && localRemaining > 0
    ? formatEndTime(calculateEndTime(localRemaining), "running")
    : null;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <TimerStateIcon state={timer.state} />
          <span className={`text-sm truncate ${isCompleted ? "text-muted-foreground line-through" : ""}`}>
            {timer.name}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {endTimeDisplay && (
            <span className="text-xs text-muted-foreground">
              {endTimeDisplay} --
            </span>
          )}
          <span className={`text-sm font-medium tabular-nums ${isCompleted ? "text-muted-foreground" : ""}`}>
            {formatTime(localRemaining)}
          </span>
        </div>
      </div>
      <Progress value={progress} className="h-1" />
    </div>
  );
}

function EmptyTimersView() {
  return (
    <div className="text-center py-4">
      <p className="text-sm text-muted-foreground mb-3">No timers configured</p>
      <Button variant="outline" size="sm" asChild>
        <Link href="/timers">Create Timer</Link>
      </Button>
    </div>
  );
}

interface TimersListProps {
  timers: Timer[];
  localRemainingMap: Map<string, number>;
}

function TimersList({ timers, localRemainingMap }: TimersListProps) {
  const sorted = sortTimers(timers);
  const visible = sorted.slice(0, MAX_VISIBLE_TIMERS);
  const hiddenCount = sorted.length - visible.length;

  return (
    <div className="space-y-3">
      {visible.map((timer) => (
        <TimerRow
          key={timer.id}
          timer={timer}
          localRemaining={localRemainingMap.get(timer.id) ?? timer.remainingSeconds}
        />
      ))}
      {hiddenCount > 0 && (
        <div className="text-center">
          <span className="text-xs text-muted-foreground">
            +{hiddenCount} more timer{hiddenCount !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}

function LoadingView() {
  return (
    <div className="text-center py-4">
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  );
}

interface TimersContentProps {
  loading: boolean;
  error: string | undefined;
  timers: Timer[];
  localRemainingMap: Map<string, number>;
}

function TimersContent({ loading, error, timers, localRemainingMap }: TimersContentProps) {
  if (loading) {
    return <LoadingView />;
  }
  if (timers.length === 0 && !error) {
    return <EmptyTimersView />;
  }
  return <TimersList timers={timers} localRemainingMap={localRemainingMap} />;
}

function calculateRemainingFromEndTime(
  timers: Timer[],
  prev: Map<string, number>
): Map<string, number> {
  const runningTimers = timers.filter((t) => t.state === "running" && t.endTime);
  if (runningTimers.length === 0) return prev;

  const now = Date.now();
  const next = new Map(prev);
  for (const timer of runningTimers) {
    const remaining = Math.max(0, Math.floor((timer.endTime!.getTime() - now) / 1000));
    next.set(timer.id, remaining);
  }
  return next;
}

export function TimerWidget() {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [localRemainingMap, setLocalRemainingMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const isMounted = useRef(true);

  // Initial load and periodic refresh
  useEffect(() => {
    isMounted.current = true;

    const loadTimers = async () => {
      const result = await getTimers();
      if (!isMounted.current) return;

      if (result.error) {
        setError(result.error);
      } else {
        setError(undefined);
        setTimers(result.timers);
        // Initialize local remaining map
        const newMap = new Map<string, number>();
        result.timers.forEach((t) => newMap.set(t.id, t.remainingSeconds));
        setLocalRemainingMap(newMap);
      }
      setLoading(false);
    };

    loadTimers();
    const refreshInterval = setInterval(loadTimers, 30000);

    return () => {
      isMounted.current = false;
      clearInterval(refreshInterval);
    };
  }, []);

  // Real-time countdown for running timers - calculate from endTime for accuracy
  useEffect(() => {
    const hasRunningTimers = timers.some((t) => t.state === "running" && t.endTime);
    if (!hasRunningTimers) return;

    const interval = setInterval(() => {
      setLocalRemainingMap((prev) => calculateRemainingFromEndTime(timers, prev));
    }, 1000);

    return () => clearInterval(interval);
  }, [timers]);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-start gap-2">
          <TimerIcon className="h-4 w-4 text-muted-foreground mt-1" />
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Timers</CardTitle>
              {timers.length > 0 && (
                <Badge variant="secondary" className="text-xs tabular-nums">
                  {timers.length}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Countdown timers & alerts
            </CardDescription>
          </div>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/timers">View All</Link>
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive mb-4">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        <TimersContent
          loading={loading}
          error={error}
          timers={timers}
          localRemainingMap={localRemainingMap}
        />
      </CardContent>
    </Card>
  );
}
