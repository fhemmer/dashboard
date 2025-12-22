"use client";

import { useEffect, useState } from "react";

interface DateTimeDisplayProps {
  className?: string;
}

export function formatTime(date: Date, includeSeconds = false): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    ...(includeSeconds && { second: "2-digit" }),
    hour12: false,
  });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatRelativeTime(loadTime: Date, now: Date): string {
  const diffMs = now.getTime() - loadTime.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffSeconds < 5) return "just now";
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return formatTime(loadTime, true);
}

interface TimeState {
  currentTime: Date;
  pageLoadTime: Date;
}

export function DateTimeDisplay({ className = "" }: DateTimeDisplayProps) {
  // Track time state - null until hydrated
  const [timeState, setTimeState] = useState<TimeState | null>(null);

  useEffect(() => {
    // Capture page load time once
    const pageLoadTime = new Date();

    // Use functional update from interval/timeout callbacks
    // This avoids the "setState in effect" lint error
    const updateTime = () => {
      setTimeState((prev) => ({
        currentTime: new Date(),
        pageLoadTime: prev?.pageLoadTime ?? pageLoadTime,
      }));
    };

    // Initial update via setTimeout (async callback pattern)
    const timeoutId = setTimeout(updateTime, 0);

    // Subsequent updates every second
    const intervalId = setInterval(updateTime, 1000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  // Prevent hydration mismatch by not rendering time until client-side
  if (!timeState) {
    return (
      <div
        className={`flex flex-col items-end ${className}`}
        aria-label="Date and time display"
      >
        {/* Skeleton placeholders */}
        <div className="h-4 w-24 animate-pulse rounded bg-muted/50" />
        <div className="mt-0.5 h-3 w-16 animate-pulse rounded bg-muted/50" />
      </div>
    );
  }

  const { currentTime, pageLoadTime } = timeState;
  const relativeLoadTime = formatRelativeTime(pageLoadTime, currentTime);

  return (
    <div
      className={`flex flex-col items-end ${className}`}
      aria-label="Date and time display"
      aria-live="polite"
      title={`Page loaded at ${formatTime(pageLoadTime, true)}`}
    >
      {/* Primary: Time and Date */}
      <div className="flex items-center gap-2">
        {/* Live indicator dot */}
        <div className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </div>

        <span className="font-mono text-sm font-semibold tracking-tight text-foreground tabular-nums">
          {formatTime(currentTime)}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {formatDate(currentTime)}
        </span>
      </div>

      {/* Secondary: Loaded time - styled like version subtitle */}
      <span className="text-xs text-muted-foreground/70">
        Loaded {relativeLoadTime}
      </span>
    </div>
  );
}
