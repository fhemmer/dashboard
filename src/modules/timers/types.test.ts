import { describe, expect, it } from "vitest";
import {
  calculateRemainingSeconds,
  formatTime,
  getProgress,
  syncTimerState,
  TIMER_PRESETS,
} from "./types";
import type { Timer, TimerState } from "./types";

describe("timers types", () => {
  describe("TIMER_PRESETS", () => {
    it("has correct preset values", () => {
      expect(TIMER_PRESETS).toEqual([
        { label: "5m", seconds: 300 },
        { label: "15m", seconds: 900 },
        { label: "30m", seconds: 1800 },
        { label: "1h", seconds: 3600 },
      ]);
    });
  });

  describe("formatTime", () => {
    it("formats seconds only", () => {
      expect(formatTime(45)).toBe("0:45");
    });

    it("formats minutes and seconds", () => {
      expect(formatTime(125)).toBe("2:05");
    });

    it("formats hours, minutes, and seconds", () => {
      expect(formatTime(3665)).toBe("1:01:05");
    });

    it("formats zero correctly", () => {
      expect(formatTime(0)).toBe("0:00");
    });

    it("pads single digit seconds", () => {
      expect(formatTime(5)).toBe("0:05");
    });

    it("pads single digit minutes when hours present", () => {
      expect(formatTime(3605)).toBe("1:00:05");
    });
  });

  describe("calculateRemainingSeconds", () => {
    it("returns null when state is not running", () => {
      const futureTime = new Date(Date.now() + 60000);
      expect(calculateRemainingSeconds(futureTime, "stopped")).toBeNull();
      expect(calculateRemainingSeconds(futureTime, "paused")).toBeNull();
      expect(calculateRemainingSeconds(futureTime, "completed")).toBeNull();
    });

    it("returns null when endTime is null", () => {
      expect(calculateRemainingSeconds(null, "running")).toBeNull();
    });

    it("calculates remaining seconds for future endTime", () => {
      const endTime = new Date(Date.now() + 60000); // 60 seconds in future
      const remaining = calculateRemainingSeconds(endTime, "running");
      expect(remaining).toBeGreaterThan(55);
      expect(remaining).toBeLessThanOrEqual(60);
    });

    it("returns 0 for past endTime", () => {
      const endTime = new Date(Date.now() - 10000); // 10 seconds ago
      expect(calculateRemainingSeconds(endTime, "running")).toBe(0);
    });
  });

  describe("syncTimerState", () => {
    const baseTimer: Timer = {
      id: "timer-1",
      userId: "user-1",
      name: "Test Timer",
      durationSeconds: 300,
      remainingSeconds: 300,
      state: "stopped",
      endTime: null,
      enableCompletionColor: true,
      completionColor: "#4CAF50",
      enableAlarm: true,
      alarmSound: "default",
      displayOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("returns timer unchanged when not running", () => {
      const timer = { ...baseTimer, state: "stopped" as TimerState };
      expect(syncTimerState(timer)).toEqual(timer);
    });

    it("returns timer unchanged when running but no endTime", () => {
      const timer = { ...baseTimer, state: "running" as TimerState };
      expect(syncTimerState(timer)).toEqual(timer);
    });

    it("updates remainingSeconds for running timer", () => {
      const endTime = new Date(Date.now() + 60000);
      const timer = {
        ...baseTimer,
        state: "running" as TimerState,
        endTime,
      };

      const synced = syncTimerState(timer);
      expect(synced.remainingSeconds).toBeGreaterThan(55);
      expect(synced.remainingSeconds).toBeLessThanOrEqual(60);
    });

    it("marks timer as completed when time runs out", () => {
      const endTime = new Date(Date.now() - 10000); // past
      const timer = {
        ...baseTimer,
        state: "running" as TimerState,
        endTime,
      };

      const synced = syncTimerState(timer);
      expect(synced.state).toBe("completed");
      expect(synced.remainingSeconds).toBe(0);
      expect(synced.endTime).toBeNull();
    });
  });

  describe("getProgress", () => {
    const baseTimer: Timer = {
      id: "timer-1",
      userId: "user-1",
      name: "Test Timer",
      durationSeconds: 300,
      remainingSeconds: 300,
      state: "stopped",
      endTime: null,
      enableCompletionColor: true,
      completionColor: "#4CAF50",
      enableAlarm: true,
      alarmSound: "default",
      displayOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("returns 0 when timer has not started", () => {
      const timer = { ...baseTimer, durationSeconds: 300, remainingSeconds: 300 };
      expect(getProgress(timer)).toBe(0);
    });

    it("returns 50 when timer is half complete", () => {
      const timer = { ...baseTimer, durationSeconds: 300, remainingSeconds: 150 };
      expect(getProgress(timer)).toBe(50);
    });

    it("returns 100 when timer is complete", () => {
      const timer = { ...baseTimer, durationSeconds: 300, remainingSeconds: 0 };
      expect(getProgress(timer)).toBe(100);
    });

    it("handles zero duration", () => {
      const timer = { ...baseTimer, durationSeconds: 0, remainingSeconds: 0 };
      expect(getProgress(timer)).toBe(0);
    });
  });
});
