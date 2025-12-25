"use client";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Pause, Play, RotateCcw, Timer as TimerIcon, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { deleteTimer, pauseTimer, resetTimer, startTimer } from "../actions";
import type { Timer } from "../types";
import { formatTime, getProgress } from "../types";

interface TimerCardProps {
  timer: Timer;
  onUpdate?: () => void;
}

export function TimerCard({ timer: initialTimer, onUpdate }: TimerCardProps) {
  const [timer, setTimer] = useState(initialTimer);
  const [localRemaining, setLocalRemaining] = useState(timer.remainingSeconds);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync with prop changes
  useEffect(() => {
    setTimer(initialTimer);
    setLocalRemaining(initialTimer.remainingSeconds);
  }, [initialTimer]);

  const handleComplete = useCallback(async () => {
    // Timer completed - dispatch event for TimerAlertProvider
    // The provider handles both audio (gated by enableAlarm) and notifications independently
    window.dispatchEvent(
      new CustomEvent("timer-complete", {
        detail: { timer },
      })
    );
    onUpdate?.();
  }, [timer, onUpdate]);

  // Client-side countdown for running timers
  useEffect(() => {
    if (timer.state !== "running") return;

    const interval = setInterval(() => {
      setLocalRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          handleComplete();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.state, handleComplete]);

  const handleStart = async () => {
    await startTimer(timer.id);
    onUpdate?.();
  };

  const handlePause = async () => {
    await pauseTimer(timer.id, localRemaining);
    onUpdate?.();
  };

  const handleReset = async () => {
    await resetTimer(timer.id);
    onUpdate?.();
  };

  const handleDelete = async () => {
    if (!confirm(`Delete timer "${timer.name}"?`)) return;
    setIsDeleting(true);
    try {
      await deleteTimer(timer.id);
      onUpdate?.();
    } catch {
      // Error is handled by resetting isDeleting state
    } finally {
      setIsDeleting(false);
    }
  };

  const progress = getProgress({
    ...timer,
    remainingSeconds: localRemaining,
  });

  const isCompleted = localRemaining === 0;
  const cardStyle = isCompleted && timer.enableCompletionColor
    ? { borderColor: timer.completionColor, borderWidth: "2px" }
    : {};

  return (
    <Card style={cardStyle} className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            <TimerIcon className="h-4 w-4 text-muted-foreground mt-1" />
            <div>
              <CardTitle className="text-base">{timer.name}</CardTitle>
              <CardDescription className="text-xs">
                {formatTime(timer.durationSeconds)} timer
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label={`Delete timer ${timer.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-center">
            <div
              className={`text-4xl font-bold tabular-nums ${
                isCompleted ? "text-destructive" : ""
              }`}
              style={
                isCompleted && timer.enableCompletionColor
                  ? { color: timer.completionColor }
                  : {}
              }
            >
              {formatTime(localRemaining)}
            </div>
          </div>

          <Progress value={progress} className="h-2" />

          <div className="flex gap-2 justify-center">
            {timer.state === "running" ? (
              <Button onClick={handlePause} size="sm" variant="outline">
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            ) : (
              <Button
                onClick={handleStart}
                size="sm"
                variant="default"
                disabled={localRemaining === 0}
              >
                <Play className="h-4 w-4 mr-2" />
                {timer.state === "paused" ? "Resume" : "Start"}
              </Button>
            )}
            <Button onClick={handleReset} size="sm" variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
