import { describe, expect, it } from "vitest";
import type { Timer, TimerState } from "./types";
import {
    calculateEndTime,
    calculateRemainingSeconds,
    formatEndTime,
    formatTime,
    getFriendlyDayPrefix,
    getProgress,
    parseTime,
    syncTimerState,
    TIMER_PRESETS,
} from "./types";

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

  describe("parseTime", () => {
    it("parses MM:SS format", () => {
      expect(parseTime("2:05")).toBe(125);
      expect(parseTime("0:45")).toBe(45);
      expect(parseTime("10:30")).toBe(630);
    });

    it("parses HH:MM:SS format", () => {
      expect(parseTime("1:01:05")).toBe(3665);
      expect(parseTime("2:30:00")).toBe(9000);
      expect(parseTime("0:05:30")).toBe(330);
    });

    it("handles leading zeros", () => {
      expect(parseTime("01:05")).toBe(65);
      expect(parseTime("00:01:05")).toBe(65);
    });

    it("handles the user's example", () => {
      // 19 hours, 11 minutes, 0 seconds = 19*3600 + 11*60 + 0 = 68400 + 660 = 69060
      expect(parseTime("19:11:00")).toBe(69060);
    });

    it("returns null for invalid formats", () => {
      expect(parseTime("")).toBeNull();
      expect(parseTime("5")).toBeNull();
      expect(parseTime("5:")).toBeNull();
      expect(parseTime(":5")).toBeNull();
      expect(parseTime("1:2:3:4")).toBeNull();
    });

    it("returns null for negative numbers", () => {
      expect(parseTime("-1:30")).toBeNull();
      expect(parseTime("1:-30")).toBeNull();
    });

    it("returns null for invalid ranges", () => {
      expect(parseTime("1:60")).toBeNull(); // seconds >= 60
      expect(parseTime("60:30")).toBeNull(); // minutes >= 60
      expect(parseTime("1:61:30")).toBeNull(); // minutes >= 60
    });

    it("returns null for non-numeric values", () => {
      expect(parseTime("abc")).toBeNull();
      expect(parseTime("1:abc")).toBeNull();
      expect(parseTime("1.5:30")).toBeNull();
    });

    it("handles whitespace", () => {
      expect(parseTime("  2:05  ")).toBe(125);
      expect(parseTime(" 1:01:05 ")).toBe(3665);
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

  describe("getFriendlyDayPrefix", () => {
    // Use a fixed "now" date for consistent testing: Wednesday, January 15, 2025
    const now = new Date(2025, 0, 15, 10, 0, 0); // Wednesday

    it("returns 'Today' for same day", () => {
      const sameDay = new Date(2025, 0, 15, 18, 30, 0);
      expect(getFriendlyDayPrefix(sameDay, now)).toBe("Today");
    });

    it("returns 'Tomorrow' for next day", () => {
      const tomorrow = new Date(2025, 0, 16, 9, 0, 0);
      expect(getFriendlyDayPrefix(tomorrow, now)).toBe("Tomorrow");
    });

    it("returns day name for 2-6 days in same week", () => {
      // Thursday (1 day after Wednesday would be Tomorrow, so test Friday = 2 days)
      const friday = new Date(2025, 0, 17, 15, 0, 0); // Friday
      expect(getFriendlyDayPrefix(friday, now)).toBe("Friday");

      const saturday = new Date(2025, 0, 18, 15, 0, 0); // Saturday
      expect(getFriendlyDayPrefix(saturday, now)).toBe("Saturday");
    });

    it("returns 'Day Next Week' for next week", () => {
      // Sunday is 5 days out but dayOfWeek (0) < Wednesday (3), so it's "next week"
      const sunday = new Date(2025, 0, 19, 15, 0, 0); // Sunday (5 days out)
      expect(getFriendlyDayPrefix(sunday, now)).toBe("Sunday Next Week");

      const nextWednesday = new Date(2025, 0, 22, 15, 0, 0); // 7 days out
      expect(getFriendlyDayPrefix(nextWednesday, now)).toBe("Wednesday Next Week");

      const nextFriday = new Date(2025, 0, 24, 15, 0, 0); // 9 days out
      expect(getFriendlyDayPrefix(nextFriday, now)).toBe("Friday Next Week");
    });

    it("returns full date for dates more than 2 weeks out", () => {
      const farOut = new Date(2025, 1, 14, 15, 0, 0); // February 14
      const result = getFriendlyDayPrefix(farOut, now);
      expect(result).toContain("Friday");
      expect(result).toContain("February");
      expect(result).toContain("14");
    });
  });

  describe("formatEndTime", () => {
    it("returns null when state is not running", () => {
      const endTime = new Date();
      expect(formatEndTime(endTime, "stopped")).toBeNull();
      expect(formatEndTime(endTime, "paused")).toBeNull();
      expect(formatEndTime(endTime, "completed")).toBeNull();
    });

    it("returns null when endTime is null", () => {
      expect(formatEndTime(null, "running")).toBeNull();
    });

    it("returns formatted time string with day prefix when running", () => {
      // Set end time to today at 3:30 PM
      const now = new Date();
      const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 30, 0);
      const result = formatEndTime(endTime, "running");
      expect(result).toMatch(/Today at 3:30\s?PM/i);
    });

    it("includes Tomorrow prefix for next day", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      const result = formatEndTime(tomorrow, "running");
      expect(result).toMatch(/Tomorrow at 9:00\s?AM/i);
    });
  });

  describe("calculateEndTime", () => {
    it("returns a date in the future based on remaining seconds", () => {
      const now = Date.now();
      const result = calculateEndTime(60);
      const expectedTime = now + 60 * 1000;
      // Allow 1 second tolerance for test execution time
      expect(result.getTime()).toBeGreaterThanOrEqual(expectedTime - 1000);
      expect(result.getTime()).toBeLessThanOrEqual(expectedTime + 1000);
    });

    it("returns approximately now when remaining is 0", () => {
      const now = Date.now();
      const result = calculateEndTime(0);
      expect(Math.abs(result.getTime() - now)).toBeLessThan(1000);
    });
  });
});
