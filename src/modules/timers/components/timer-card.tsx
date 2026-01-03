"use client";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Pause, Play, RotateCcw, Timer as TimerIcon, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { deleteTimer, pauseTimer, resetTimer, startTimer, updateTimer } from "../actions";
import type { Timer, TimerState } from "../types";
import { calculateEndTime, formatEndTime, formatTime, getProgress, parseTime } from "../types";

interface TimerCardProps {
  timer: Timer;
  onUpdate?: () => void;
}

interface TimeDisplayProps {
  isEditing: boolean;
  editValue: string;
  localRemaining: number;
  isCompleted: boolean;
  timerState: TimerState;
  enableCompletionColor: boolean;
  completionColor: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onEditChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEditBlur: () => void;
  onEditKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onStartEdit: () => void;
}

function TimeDisplay({
  isEditing,
  editValue,
  localRemaining,
  isCompleted,
  timerState,
  enableCompletionColor,
  completionColor,
  inputRef,
  onEditChange,
  onEditBlur,
  onEditKeyDown,
  onStartEdit,
}: TimeDisplayProps) {
  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={onEditChange}
        onBlur={onEditBlur}
        onKeyDown={onEditKeyDown}
        className="text-4xl font-bold tabular-nums text-center h-auto py-2 border-2"
        placeholder="HH:MM:SS"
      />
    );
  }

  const showCompletionColor = isCompleted && enableCompletionColor;
  const style = showCompletionColor ? { color: completionColor } : {};
  const isRunning = timerState === "running";

  return (
    <div
      className={`text-4xl font-bold tabular-nums cursor-pointer hover:opacity-80 transition-opacity ${
        isCompleted ? "text-destructive" : ""
      } ${isRunning ? "cursor-default" : ""}`}
      style={style}
      onClick={onStartEdit}
      role="button"
      tabIndex={isRunning ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onStartEdit();
        }
      }}
      aria-label="Click to edit time"
    >
      {formatTime(localRemaining)}
    </div>
  );
}

interface TimerControlsProps {
  timerState: TimerState;
  localRemaining: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

function TimerControls({ timerState, localRemaining, onStart, onPause, onReset }: TimerControlsProps) {
  return (
    <div className="flex gap-2 justify-center">
      {timerState === "running" ? (
        <Button onClick={onPause} size="sm" variant="outline">
          <Pause className="h-4 w-4 mr-2" />
          Pause
        </Button>
      ) : (
        <Button onClick={onStart} size="sm" variant="default" disabled={localRemaining === 0}>
          <Play className="h-4 w-4 mr-2" />
          {timerState === "paused" ? "Resume" : "Start"}
        </Button>
      )}
      <Button onClick={onReset} size="sm" variant="outline">
        <RotateCcw className="h-4 w-4 mr-2" />
        Reset
      </Button>
    </div>
  );
}

export function TimerCard({ timer: initialTimer, onUpdate }: TimerCardProps) {
  const [timer, setTimer] = useState(initialTimer);
  const [localRemaining, setLocalRemaining] = useState(timer.remainingSeconds);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const hasCompletedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with prop changes
  useEffect(() => {
    setTimer(initialTimer);
    setLocalRemaining(initialTimer.remainingSeconds);
    // Reset completion flag when timer is reset
    if (initialTimer.state !== "completed" && initialTimer.remainingSeconds > 0) {
      hasCompletedRef.current = false;
    }
  }, [initialTimer]);

  const handleComplete = useCallback(async () => {
    // Guard against double invocation (React Strict Mode)
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;

    // Persist completed state to database
    await updateTimer(timer.id, {
      state: "completed",
      remainingSeconds: 0,
      endTime: null,
    });

    // Timer completed - dispatch event for TimerAlertProvider
    // The provider handles both audio (gated by enableAlarm) and notifications independently
    window.dispatchEvent(
      new CustomEvent("timer-complete", {
        detail: { timer },
      })
    );
    onUpdate?.();
  }, [timer, onUpdate]);

  // Handle timer completion when localRemaining reaches 0
  useEffect(() => {
    if (localRemaining <= 0 && timer.state === "running" && !hasCompletedRef.current) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      handleComplete();
    }
  }, [localRemaining, timer.state, handleComplete]);

  // Client-side countdown for running timers
  useEffect(() => {
    if (timer.state !== "running") return;

    intervalRef.current = setInterval(() => {
      setLocalRemaining((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timer.state]);

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

  const handleStartEdit = () => {
    if (timer.state === "running") return; // Can't edit while running
    setEditValue(formatTime(localRemaining));
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  const handleEditBlur = async () => {
    const newSeconds = parseTime(editValue);
    if (newSeconds !== null && newSeconds !== localRemaining) {
      setLocalRemaining(newSeconds);
      // Update both duration and remaining time so Reset uses the new value
      await updateTimer(timer.id, {
        durationSeconds: newSeconds,
        remainingSeconds: newSeconds,
        state: "stopped",
        endTime: null,
      });
      onUpdate?.();
    }
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      setIsEditing(false);
    }
  };

  const progress = getProgress({
    ...timer,
    remainingSeconds: localRemaining,
  });

  const isCompleted = localRemaining === 0;
  const endTimeDisplay = timer.state === "running" && localRemaining > 0
    ? formatEndTime(calculateEndTime(localRemaining), "running")
    : null;
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
                {endTimeDisplay && (
                  <span className="ml-1">· Done {endTimeDisplay}</span>
                )}
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
            <TimeDisplay
              isEditing={isEditing}
              editValue={editValue}
              localRemaining={localRemaining}
              isCompleted={isCompleted}
              timerState={timer.state}
              enableCompletionColor={timer.enableCompletionColor}
              completionColor={timer.completionColor}
              inputRef={inputRef}
              onEditChange={handleEditChange}
              onEditBlur={handleEditBlur}
              onEditKeyDown={handleEditKeyDown}
              onStartEdit={handleStartEdit}
            />
          </div>

          <Progress value={progress} className="h-2" />

          <TimerControls
            timerState={timer.state}
            localRemaining={localRemaining}
            onStart={handleStart}
            onPause={handlePause}
            onReset={handleReset}
          />
        </div>
      </CardContent>
    </Card>
  );
}
