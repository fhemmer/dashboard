import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createTimer,
    deleteTimer,
    getTimers,
    pauseTimer,
    resetTimer,
    startTimer,
    updateTimer,
} from "./actions";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}));

// Helper to create chainable mock
function createChainMock(finalResult: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(finalResult),
    limit: vi.fn().mockResolvedValue(finalResult),
    single: vi.fn().mockResolvedValue(finalResult),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
  return chain;
}

describe("timers actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });
  });

  describe("getTimers", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await getTimers();

      expect(result).toEqual({ timers: [], error: "Not authenticated" });
    });

    it("returns timers for authenticated user", async () => {
      const mockData = [
        {
          id: "timer-1",
          user_id: "user-123",
          name: "Work Timer",
          duration_seconds: 1500,
          remaining_seconds: 1500,
          state: "stopped",
          end_time: null,
          enable_completion_color: true,
          completion_color: "#4CAF50",
          enable_alarm: true,
          alarm_sound: "default",
          display_order: 0,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      const chain = createChainMock({ data: mockData, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await getTimers();

      expect(result.error).toBeUndefined();
      expect(result.timers).toHaveLength(1);
      expect(result.timers[0].name).toBe("Work Timer");
      expect(result.timers[0].durationSeconds).toBe(1500);
      expect(mockFrom).toHaveBeenCalledWith("timers");
      expect(chain.select).toHaveBeenCalledWith("*");
      expect(chain.eq).toHaveBeenCalledWith("user_id", "user-123");
    });

    it("returns error on database failure", async () => {
      const chain = createChainMock({
        data: null,
        error: { message: "Database error" },
      });
      mockFrom.mockReturnValue(chain);

      const result = await getTimers();

      expect(result.error).toBe("Database error");
      expect(result.timers).toEqual([]);
    });

    it("returns empty array when data is null but no error", async () => {
      const chain = createChainMock({
        data: null,
        error: null,
      });
      mockFrom.mockReturnValue(chain);

      const result = await getTimers();

      expect(result.error).toBeUndefined();
      expect(result.timers).toEqual([]);
    });

    it("syncs running timers on load", async () => {
      const mockData = [
        {
          id: "timer-1",
          user_id: "user-123",
          name: "Running Timer",
          duration_seconds: 300,
          remaining_seconds: 60,
          state: "running",
          end_time: new Date(Date.now() + 50000).toISOString(),
          enable_completion_color: true,
          completion_color: "#4CAF50",
          enable_alarm: true,
          alarm_sound: "default",
          display_order: 0,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      const chain = createChainMock({ data: mockData, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await getTimers();

      expect(result.timers[0].remainingSeconds).toBeGreaterThan(40);
      expect(result.timers[0].remainingSeconds).toBeLessThanOrEqual(60);
    });
  });

  describe("createTimer", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await createTimer({
        name: "Test Timer",
        durationSeconds: 300,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("returns error when name is empty", async () => {
      const result = await createTimer({
        name: "   ",
        durationSeconds: 300,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Timer name is required");
    });

    it("returns error when name exceeds max length", async () => {
      const result = await createTimer({
        name: "a".repeat(101),
        durationSeconds: 300,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Timer name must be 100 characters or less");
    });

    it("returns error when durationSeconds is less than 1", async () => {
      const result = await createTimer({
        name: "Test Timer",
        durationSeconds: 0,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Duration must be at least 1 second");
    });

    it("returns error when durationSeconds exceeds 24 hours", async () => {
      const result = await createTimer({
        name: "Test Timer",
        durationSeconds: 86401,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Duration cannot exceed 24 hours");
    });

    it("creates timer successfully", async () => {
      const selectChain = createChainMock({ data: [], error: null });
      const insertChain = createChainMock({
        data: { id: "timer-new" },
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === "timers") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            insert: vi.fn().mockReturnValue(insertChain),
          };
        }
        return selectChain;
      });

      const result = await createTimer({
        name: "New Timer",
        durationSeconds: 600,
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe("timer-new");
    });

    it("handles database error on create", async () => {
      const selectChain = createChainMock({ data: [], error: null });
      const insertChain = createChainMock({
        data: null,
        error: { message: "Insert failed" },
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === "timers") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            insert: vi.fn().mockReturnValue(insertChain),
          };
        }
        return selectChain;
      });

      const result = await createTimer({
        name: "New Timer",
        durationSeconds: 600,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Insert failed");
    });
  });

  describe("updateTimer", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await updateTimer("timer-1", { name: "Updated" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("returns error when name is empty", async () => {
      const result = await updateTimer("timer-1", { name: "   " });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Timer name cannot be empty");
    });

    it("returns error when name exceeds max length", async () => {
      const result = await updateTimer("timer-1", { name: "a".repeat(101) });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Timer name must be 100 characters or less");
    });

    it("returns error when durationSeconds is less than 1", async () => {
      const result = await updateTimer("timer-1", { durationSeconds: 0 });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Duration must be at least 1 second");
    });

    it("returns error when durationSeconds exceeds 24 hours", async () => {
      const result = await updateTimer("timer-1", { durationSeconds: 86401 });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Duration cannot exceed 24 hours");
    });

    it("returns error when remainingSeconds is negative", async () => {
      const result = await updateTimer("timer-1", { remainingSeconds: -1 });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Remaining seconds must be non-negative");
    });

    it("returns error when state is invalid", async () => {
      const result = await updateTimer("timer-1", { state: "invalid" as "stopped" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid timer state");
    });

    it("returns error when displayOrder is negative", async () => {
      const result = await updateTimer("timer-1", { displayOrder: -1 });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Display order must be non-negative");
    });

    it("updates timer successfully", async () => {
      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      // Second eq call returns the final result
      chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await updateTimer("timer-1", {
        name: "Updated Timer",
        remainingSeconds: 150,
      });

      expect(result.success).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith("timers");
      expect(chain.update).toHaveBeenCalledWith({
        name: "Updated Timer",
        remaining_seconds: 150,
      });
    });

    it("updates timer with all optional fields", async () => {
      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      // Second eq call returns the final result
      chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const endTime = new Date("2025-01-15T12:00:00Z");
      const result = await updateTimer("timer-1", {
        name: "Updated Timer",
        durationSeconds: 600,
        remainingSeconds: 300,
        state: "running",
        endTime,
        enableCompletionColor: false,
        completionColor: "#FF0000",
        enableAlarm: false,
        alarmSound: "bell",
        displayOrder: 5,
      });

      expect(result.success).toBe(true);
      expect(chain.update).toHaveBeenCalledWith({
        name: "Updated Timer",
        duration_seconds: 600,
        remaining_seconds: 300,
        state: "running",
        end_time: endTime.toISOString(),
        enable_completion_color: false,
        completion_color: "#FF0000",
        enable_alarm: false,
        alarm_sound: "bell",
        display_order: 5,
      });
    });

    it("updates timer with null endTime", async () => {
      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await updateTimer("timer-1", {
        endTime: null,
      });

      expect(result.success).toBe(true);
      expect(chain.update).toHaveBeenCalledWith({
        end_time: null,
      });
    });

    it("handles database error on update", async () => {
      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      // Second eq call returns the error
      chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({
        data: null,
        error: { message: "Update failed" },
      });
      mockFrom.mockReturnValue(chain);

      const result = await updateTimer("timer-1", { name: "Updated" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Update failed");
    });
  });

  describe("deleteTimer", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await deleteTimer("timer-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("deletes timer successfully", async () => {
      const chain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      // Second eq call returns the final result
      chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await deleteTimer("timer-1");

      expect(result.success).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith("timers");
      expect(chain.delete).toHaveBeenCalled();
    });

    it("handles database error on delete", async () => {
      const chain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      // Second eq call returns the error
      chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({
        data: null,
        error: { message: "Delete failed" },
      });
      mockFrom.mockReturnValue(chain);

      const result = await deleteTimer("timer-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Delete failed");
    });
  });

  describe("startTimer", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await startTimer("timer-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("starts timer successfully", async () => {
      const updateChain = createChainMock({ data: null, error: null });

      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { remaining_seconds: 300 }, error: null }),
        update: vi.fn().mockReturnValue(updateChain),
      }));

      const result = await startTimer("timer-1");

      expect(result.success).toBe(true);
    });

    it("returns error when timer not found", async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
      }));

      const result = await startTimer("timer-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Timer not found");
    });
  });

  describe("pauseTimer", () => {
    it("pauses timer successfully", async () => {
      const chain = createChainMock({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await pauseTimer("timer-1", 150);

      expect(result.success).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith("timers");
    });
  });

  describe("resetTimer", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await resetTimer("timer-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("resets timer successfully", async () => {
      const updateChain = createChainMock({ data: null, error: null });

      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { duration_seconds: 300 }, error: null }),
        update: vi.fn().mockReturnValue(updateChain),
      }));

      const result = await resetTimer("timer-1");

      expect(result.success).toBe(true);
    });

    it("returns error when timer not found", async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
      }));

      const result = await resetTimer("timer-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Timer not found");
    });
  });
});
