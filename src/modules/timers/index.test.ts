import { describe, expect, it } from "vitest";
import * as timersModule from "./index";

describe("timers module exports", () => {
  it("exports TimerWidget component", () => {
    expect(timersModule.TimerWidget).toBeDefined();
  });

  it("exports action functions", () => {
    expect(timersModule.createTimer).toBeDefined();
    expect(timersModule.deleteTimer).toBeDefined();
    expect(timersModule.getTimers).toBeDefined();
    expect(timersModule.pauseTimer).toBeDefined();
    expect(timersModule.resetTimer).toBeDefined();
    expect(timersModule.startTimer).toBeDefined();
    expect(timersModule.updateTimer).toBeDefined();
  });

  it("exports utility functions", () => {
    expect(timersModule.formatTime).toBeDefined();
    expect(timersModule.getProgress).toBeDefined();
    expect(timersModule.syncTimerState).toBeDefined();
  });

  it("exports constants", () => {
    expect(timersModule.TIMER_PRESETS).toBeDefined();
    expect(timersModule.TIMER_PRESETS).toHaveLength(4);
  });
});
