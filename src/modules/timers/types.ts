export type TimerState = "stopped" | "running" | "paused" | "completed";

export interface Timer {
  id: string;
  userId: string;
  name: string;
  durationSeconds: number;
  remainingSeconds: number;
  state: TimerState;
  endTime: Date | null;
  enableCompletionColor: boolean;
  completionColor: string;
  enableAlarm: boolean;
  alarmSound: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimerInput {
  name: string;
  durationSeconds: number;
  enableCompletionColor?: boolean;
  completionColor?: string;
  enableAlarm?: boolean;
  alarmSound?: string;
}

export interface TimerUpdateInput {
  name?: string;
  durationSeconds?: number;
  remainingSeconds?: number;
  state?: TimerState;
  endTime?: Date | null;
  enableCompletionColor?: boolean;
  completionColor?: string;
  enableAlarm?: boolean;
  alarmSound?: string;
  displayOrder?: number;
}

export interface FetchTimersResult {
  timers: Timer[];
  error?: string;
}

export interface UpdateResult {
  success: boolean;
  error?: string;
}

export const TIMER_PRESETS = [
  { label: "5m", seconds: 300 },
  { label: "15m", seconds: 900 },
  { label: "30m", seconds: 1800 },
  { label: "1h", seconds: 3600 },
] as const;

/**
 * Format seconds into a human-readable time string (MM:SS or HH:MM:SS)
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Parse a time string (MM:SS or HH:MM:SS) into seconds
 * Returns null if the format is invalid
 */
export function parseTime(timeStr: string): number | null {
  const trimmed = timeStr.trim();
  const parts = trimmed.split(":");

  if (parts.length < 2 || parts.length > 3) {
    return null;
  }

  const numbers = parts.map((p) => {
    // Check for decimal points or non-integer values
    if (p.includes(".")) {
      return null;
    }
    const num = parseInt(p, 10);
    return isNaN(num) || num < 0 ? null : num;
  });

  if (numbers.some((n) => n === null)) {
    return null;
  }

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 3) {
    // HH:MM:SS
    [hours, minutes, seconds] = numbers as number[];
  } else {
    // MM:SS
    [minutes, seconds] = numbers as number[];
  }

  // Validate ranges
  if (minutes >= 60 || seconds >= 60) {
    return null;
  }

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Calculate remaining seconds for a running timer based on end_time
 */
export function calculateRemainingSeconds(
  endTime: Date | null,
  state: TimerState
): number | null {
  if (!endTime || state !== "running") {
    return null;
  }

  const now = new Date();
  const remaining = Math.floor((endTime.getTime() - now.getTime()) / 1000);
  return Math.max(0, remaining);
}

/**
 * Sync timer state - recalculates remaining_seconds for running timers
 */
export function syncTimerState(timer: Timer): Timer {
  if (timer.state === "running" && timer.endTime) {
    const remaining = calculateRemainingSeconds(timer.endTime, timer.state);
    if (remaining !== null) {
      if (remaining === 0) {
        return {
          ...timer,
          state: "completed",
          remainingSeconds: 0,
          endTime: null,
        };
      }
      return {
        ...timer,
        remainingSeconds: remaining,
      };
    }
  }
  return timer;
}

/**
 * Get progress percentage (0-100)
 */
export function getProgress(timer: Timer): number {
  if (timer.durationSeconds === 0) return 0;
  return ((timer.durationSeconds - timer.remainingSeconds) / timer.durationSeconds) * 100;
}

/**
 * Get a friendly day prefix for a date relative to today
 * Examples: "Today", "Tomorrow", "Tuesday", "Friday Next Week", "Monday February 14"
 */
export function getFriendlyDayPrefix(date: Date, now: Date = new Date()): string {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysDiff = Math.floor((startOfTarget.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) {
    return "Today";
  }
  if (daysDiff === 1) {
    return "Tomorrow";
  }

  const dayName = date.toLocaleDateString([], { weekday: "long" });

  // Within current week (2-6 days out, same week)
  const todayDayOfWeek = now.getDay();
  const targetDayOfWeek = date.getDay();

  if (daysDiff >= 2 && daysDiff <= 6 && targetDayOfWeek > todayDayOfWeek) {
    return dayName;
  }

  // Next week (7-13 days out)
  if (daysDiff >= 2 && daysDiff <= 13) {
    return `${dayName} Next Week`;
  }

  // Further out - show full date
  return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

/**
 * Format end time with a friendly day prefix and time
 * Examples: "Today at 3:45 PM", "Tomorrow at 9:00 AM", "Tuesday at 5:30 PM"
 * Returns null if the timer is not running or has no end time
 */
export function formatEndTime(endTime: Date | null, state: TimerState): string | null {
  if (!endTime || state !== "running") {
    return null;
  }
  const dayPrefix = getFriendlyDayPrefix(endTime);
  const timeStr = endTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${dayPrefix} at ${timeStr}`;
}

/**
 * Calculate end time from current remaining seconds
 */
export function calculateEndTime(remainingSeconds: number): Date {
  return new Date(Date.now() + remainingSeconds * 1000);
}
