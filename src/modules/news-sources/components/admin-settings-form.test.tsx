import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the actions
const mockUpdateSystemSetting = vi.fn();

vi.mock("../actions", () => ({
  updateSystemSetting: (...args: unknown[]) => mockUpdateSystemSetting(...args),
}));

import { AdminSettingsForm } from "./admin-settings-form";

describe("AdminSettingsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateSystemSetting.mockResolvedValue({ success: true });
  });

  it("renders form with all fields", () => {
    render(
      <AdminSettingsForm
        fetchIntervalMinutes={30}
        notificationRetentionDays={30}
        lastFetchAt={null}
      />
    );

    expect(screen.getByLabelText(/Fetch Interval/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Notification Retention/i)).toBeInTheDocument();
    expect(screen.getByText(/Last fetch:/i)).toBeInTheDocument();
  });

  it("displays initial values", () => {
    render(
      <AdminSettingsForm
        fetchIntervalMinutes={60}
        notificationRetentionDays={14}
        lastFetchAt="2025-01-01T12:00:00Z"
      />
    );

    expect(screen.getByLabelText(/Fetch Interval/i)).toHaveValue(60);
    expect(screen.getByLabelText(/Notification Retention/i)).toHaveValue(14);
  });

  it("displays Never when lastFetchAt is null", () => {
    render(
      <AdminSettingsForm
        fetchIntervalMinutes={30}
        notificationRetentionDays={30}
        lastFetchAt={null}
      />
    );

    expect(screen.getByText(/Never/)).toBeInTheDocument();
  });

  it("displays Never when lastFetchAt is 'null' string", () => {
    render(
      <AdminSettingsForm
        fetchIntervalMinutes={30}
        notificationRetentionDays={30}
        lastFetchAt="null"
      />
    );

    expect(screen.getByText(/Never/)).toBeInTheDocument();
  });

  it("formats lastFetchAt as locale string", () => {
    const timestamp = "2025-01-15T10:30:00Z";
    render(
      <AdminSettingsForm
        fetchIntervalMinutes={30}
        notificationRetentionDays={30}
        lastFetchAt={timestamp}
      />
    );

    // The exact format depends on locale, just check it doesn't say "Never"
    expect(screen.queryByText(/Never/)).not.toBeInTheDocument();
  });

  it("calls updateSystemSetting when form is submitted", async () => {
    render(
      <AdminSettingsForm
        fetchIntervalMinutes={30}
        notificationRetentionDays={30}
        lastFetchAt={null}
      />
    );

    fireEvent.submit(screen.getByTestId("admin-settings-form"));

    await waitFor(() => {
      expect(mockUpdateSystemSetting).toHaveBeenCalledWith(
        "fetch_interval_minutes",
        30
      );
      expect(mockUpdateSystemSetting).toHaveBeenCalledWith(
        "notification_retention_days",
        30
      );
    });
  });

  it("updates fetch interval when changed", async () => {
    render(
      <AdminSettingsForm
        fetchIntervalMinutes={30}
        notificationRetentionDays={30}
        lastFetchAt={null}
      />
    );

    fireEvent.change(screen.getByLabelText(/Fetch Interval/i), {
      target: { value: "45" },
    });

    fireEvent.submit(screen.getByTestId("admin-settings-form"));

    await waitFor(() => {
      expect(mockUpdateSystemSetting).toHaveBeenCalledWith(
        "fetch_interval_minutes",
        45
      );
    });
  });

  it("updates retention days when changed", async () => {
    render(
      <AdminSettingsForm
        fetchIntervalMinutes={30}
        notificationRetentionDays={30}
        lastFetchAt={null}
      />
    );

    fireEvent.change(screen.getByLabelText(/Notification Retention/i), {
      target: { value: "7" },
    });

    fireEvent.submit(screen.getByTestId("admin-settings-form"));

    await waitFor(() => {
      expect(mockUpdateSystemSetting).toHaveBeenCalledWith(
        "notification_retention_days",
        7
      );
    });
  });

  it("shows success message after successful save", async () => {
    render(
      <AdminSettingsForm
        fetchIntervalMinutes={30}
        notificationRetentionDays={30}
        lastFetchAt={null}
      />
    );

    fireEvent.submit(screen.getByTestId("admin-settings-form"));

    await waitFor(() => {
      expect(screen.getByText(/Settings saved successfully/)).toBeInTheDocument();
    });
  });

  it("shows error message when save fails", async () => {
    mockUpdateSystemSetting.mockResolvedValue({
      success: false,
      error: "Update failed",
    });

    render(
      <AdminSettingsForm
        fetchIntervalMinutes={30}
        notificationRetentionDays={30}
        lastFetchAt={null}
      />
    );

    fireEvent.submit(screen.getByTestId("admin-settings-form"));

    await waitFor(() => {
      expect(screen.getByText("Update failed")).toBeInTheDocument();
    });
  });

  it("shows default error when save fails without message", async () => {
    mockUpdateSystemSetting.mockResolvedValue({
      success: false,
      error: null,
    });

    render(
      <AdminSettingsForm
        fetchIntervalMinutes={30}
        notificationRetentionDays={30}
        lastFetchAt={null}
      />
    );

    fireEvent.submit(screen.getByTestId("admin-settings-form"));

    await waitFor(() => {
      expect(screen.getByText("Failed to save settings")).toBeInTheDocument();
    });
  });

  it("shows Saving... while submitting", async () => {
    mockUpdateSystemSetting.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
    );

    render(
      <AdminSettingsForm
        fetchIntervalMinutes={30}
        notificationRetentionDays={30}
        lastFetchAt={null}
      />
    );

    fireEvent.submit(screen.getByTestId("admin-settings-form"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Saving..." })).toBeInTheDocument();
    });
  });

  it("disables inputs while submitting", async () => {
    mockUpdateSystemSetting.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
    );

    render(
      <AdminSettingsForm
        fetchIntervalMinutes={30}
        notificationRetentionDays={30}
        lastFetchAt={null}
      />
    );

    fireEvent.submit(screen.getByTestId("admin-settings-form"));

    await waitFor(() => {
      expect(screen.getByLabelText(/Fetch Interval/i)).toBeDisabled();
      expect(screen.getByLabelText(/Notification Retention/i)).toBeDisabled();
    });
  });

  it("has correct min/max values for fetch interval", () => {
    render(
      <AdminSettingsForm
        fetchIntervalMinutes={30}
        notificationRetentionDays={30}
        lastFetchAt={null}
      />
    );

    const input = screen.getByLabelText(/Fetch Interval/i);
    expect(input).toHaveAttribute("min", "5");
    expect(input).toHaveAttribute("max", "1440");
  });

  it("has correct min/max values for retention days", () => {
    render(
      <AdminSettingsForm
        fetchIntervalMinutes={30}
        notificationRetentionDays={30}
        lastFetchAt={null}
      />
    );

    const input = screen.getByLabelText(/Notification Retention/i);
    expect(input).toHaveAttribute("min", "1");
    expect(input).toHaveAttribute("max", "365");
  });

  it("clears error state on new submission", async () => {
    mockUpdateSystemSetting
      .mockResolvedValueOnce({ success: false, error: "First error" })
      .mockResolvedValueOnce({ success: true });

    render(
      <AdminSettingsForm
        fetchIntervalMinutes={30}
        notificationRetentionDays={30}
        lastFetchAt={null}
      />
    );

    // First submit - should show error
    fireEvent.submit(screen.getByTestId("admin-settings-form"));

    await waitFor(() => {
      expect(screen.getByText("First error")).toBeInTheDocument();
    });

    // Second submit - error should be cleared and show success
    fireEvent.submit(screen.getByTestId("admin-settings-form"));

    await waitFor(() => {
      expect(screen.queryByText("First error")).not.toBeInTheDocument();
      expect(screen.getByText(/Settings saved successfully/)).toBeInTheDocument();
    });
  });
});
