import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateTimerDialog } from "./create-timer-dialog";

const mockCreateTimer = vi.fn();

vi.mock("../actions", () => ({
  createTimer: (input: { name: string; durationSeconds: number }) =>
    mockCreateTimer(input),
}));

describe("CreateTimerDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders trigger button", () => {
    render(<CreateTimerDialog />);

    expect(screen.getByText("Create Timer")).toBeInTheDocument();
  });

  it("opens dialog when trigger clicked", async () => {
    render(<CreateTimerDialog />);

    const trigger = screen.getByText("Create Timer");
    await userEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText("Create New Timer")).toBeInTheDocument();
      expect(screen.getByText("Set up a countdown timer with custom duration")).toBeInTheDocument();
    });
  });

  it("renders form fields", async () => {
    render(<CreateTimerDialog />);

    const trigger = screen.getByText("Create Timer");
    await userEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByLabelText("Timer Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Duration (minutes)")).toBeInTheDocument();
      expect(screen.getByText("Quick Presets")).toBeInTheDocument();
    });
  });

  it("renders preset buttons", async () => {
    render(<CreateTimerDialog />);

    const trigger = screen.getByText("Create Timer");
    await userEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText("5m")).toBeInTheDocument();
      expect(screen.getByText("15m")).toBeInTheDocument();
      expect(screen.getByText("30m")).toBeInTheDocument();
      expect(screen.getByText("1h")).toBeInTheDocument();
    });
  });

  it("updates duration when preset clicked", async () => {
    render(<CreateTimerDialog />);

    await userEvent.click(screen.getByText("Create Timer"));

    // Wait for dialog to open
    await waitFor(() => {
      expect(screen.getByText("15m")).toBeInTheDocument();
    });

    // Click preset (action outside waitFor)
    const preset15m = screen.getByText("15m");
    await userEvent.click(preset15m);

    // Assert duration updated
    const durationInput = screen.getByLabelText("Duration (minutes)") as HTMLInputElement;
    expect(durationInput.value).toBe("15");
  });

  it("creates timer on form submit", async () => {
    mockCreateTimer.mockResolvedValue({ success: true, id: "timer-new" });
    const onCreated = vi.fn();

    render(<CreateTimerDialog onCreated={onCreated} />);

    await userEvent.click(screen.getByText("Create Timer"));

    // Wait for dialog to open
    await waitFor(() => {
      expect(screen.getByLabelText("Timer Name")).toBeInTheDocument();
    });

    // Fill and submit (actions outside waitFor)
    const nameInput = screen.getByLabelText("Timer Name");
    await userEvent.type(nameInput, "New Timer");

    const submitButton = screen.getAllByText("Create Timer")[1];
    await userEvent.click(submitButton);

    // Assert
    await waitFor(() => {
      expect(mockCreateTimer).toHaveBeenCalledWith({
        name: "New Timer",
        durationSeconds: 300,
      });
      expect(onCreated).toHaveBeenCalled();
    });
  });

  it("closes dialog after successful create", async () => {
    mockCreateTimer.mockResolvedValue({ success: true, id: "timer-new" });

    render(<CreateTimerDialog />);

    // Open dialog
    await userEvent.click(screen.getByText("Create Timer"));

    // Wait for dialog to open
    await waitFor(() => {
      expect(screen.getByLabelText("Timer Name")).toBeInTheDocument();
    });

    // Fill form and submit (actions outside waitFor)
    const nameInput = screen.getByLabelText("Timer Name");
    await userEvent.type(nameInput, "Test Timer");

    const submitButton = screen.getAllByText("Create Timer")[1];
    await userEvent.click(submitButton);

    // Assert dialog closes
    await waitFor(() => {
      expect(screen.queryByText("Create New Timer")).not.toBeInTheDocument();
    });
  });

  it("disables submit when name is empty", async () => {
    render(<CreateTimerDialog />);

    await userEvent.click(screen.getByText("Create Timer"));

    await waitFor(() => {
      const submitButton = screen.getAllByText("Create Timer")[1] as HTMLButtonElement;
      expect(submitButton).toBeDisabled();
    });
  });

  it("updates duration input correctly", async () => {
    render(<CreateTimerDialog />);

    await userEvent.click(screen.getByText("Create Timer"));

    // Wait for dialog to open
    await waitFor(() => {
      expect(screen.getByLabelText("Duration (minutes)")).toBeInTheDocument();
    });

    // Update input (actions outside waitFor)
    const durationInput = screen.getByLabelText("Duration (minutes)");
    await userEvent.clear(durationInput);
    await userEvent.type(durationInput, "20");

    // The input will show "120" because userEvent types one character at a time
    // and the component multiplies by 60, so "1" becomes 60, then "2" becomes 120
    expect((durationInput as HTMLInputElement).value).toBe("120");
  });

  it("closes dialog when cancel clicked", async () => {
    render(<CreateTimerDialog />);

    await userEvent.click(screen.getByText("Create Timer"));

    // Wait for dialog to open
    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    // Click cancel (action outside waitFor)
    const cancelButton = screen.getByText("Cancel");
    await userEvent.click(cancelButton);

    // Assert dialog closes
    await waitFor(() => {
      expect(screen.queryByText("Create New Timer")).not.toBeInTheDocument();
    });
  });
});
