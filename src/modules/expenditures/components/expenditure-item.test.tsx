import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExpenditureSource } from "../types";
import { ExpenditureItem } from "./expenditure-item";

vi.mock("../actions", () => ({
  updateExpenditureSource: vi.fn(),
  deleteExpenditureSource: vi.fn(),
}));

const { updateExpenditureSource, deleteExpenditureSource } = await import("../actions");

const mockSource: ExpenditureSource = {
  id: "exp-1",
  userId: "user-1",
  name: "AWS",
  baseCost: 100,
  billingCycle: "monthly",
  billingDayOfMonth: 15,
  billingMonth: null,
  consumptionCost: 50,
  detailsUrl: "https://aws.amazon.com",
  notes: "Test notes",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-02"),
};

describe("ExpenditureItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("display mode", () => {
    it("renders source name and costs", () => {
      render(<ExpenditureItem source={mockSource} />);

      expect(screen.getByText("AWS")).toBeDefined();
      expect(screen.getByText(/Base: \$100\.00/)).toBeDefined();
      expect(screen.getByText(/Consumption: \$50\.00/)).toBeDefined();
      expect(screen.getByText("$150.00")).toBeDefined(); // Total
    });

    it("renders details link when URL provided", () => {
      render(<ExpenditureItem source={mockSource} />);

      const link = screen.getByText("View details");
      expect(link).toBeDefined();
      expect(link.getAttribute("href")).toBe("https://aws.amazon.com");
      expect(link.getAttribute("target")).toBe("_blank");
    });

    it("does not render details link when URL is null", () => {
      const sourceWithoutUrl = { ...mockSource, detailsUrl: null };
      render(<ExpenditureItem source={sourceWithoutUrl} />);

      expect(screen.queryByText("View details")).toBeNull();
    });

    it("does not show consumption when zero", () => {
      const sourceNoConsumption = { ...mockSource, consumptionCost: 0 };
      render(<ExpenditureItem source={sourceNoConsumption} />);

      expect(screen.queryByText(/Consumption:/)).toBeNull();
    });

    it("shows billing day", () => {
      render(<ExpenditureItem source={mockSource} />);

      expect(screen.getByText(/\(day 15\)/)).toBeDefined();
    });

    it("shows edit button", () => {
      render(<ExpenditureItem source={mockSource} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBe(2); // edit and delete buttons
    });
  });

  describe("edit mode", () => {
    it("enters edit mode when clicking edit button", () => {
      render(<ExpenditureItem source={mockSource} />);

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]); // Edit button is first

      expect(screen.getByLabelText("Name")).toBeDefined();
      expect(screen.getByLabelText("Base Cost ($)")).toBeDefined();
      expect(screen.getByLabelText("Billing Cycle")).toBeDefined();
      expect(screen.getByLabelText("Billing Day")).toBeDefined();
      expect(screen.getByLabelText("Consumption ($)")).toBeDefined();
      expect(screen.getByLabelText("Details URL")).toBeDefined();
      expect(screen.getByLabelText("Notes")).toBeDefined();
    });

    it("pre-fills form with current values", () => {
      render(<ExpenditureItem source={mockSource} />);

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]); // Edit button is first

      expect(screen.getByLabelText("Name")).toHaveValue("AWS");
      expect(screen.getByLabelText("Base Cost ($)")).toHaveValue(100);
      expect(screen.getByLabelText("Billing Day")).toHaveValue(15);
      expect(screen.getByLabelText("Consumption ($)")).toHaveValue(50);
      expect(screen.getByLabelText("Details URL")).toHaveValue(
        "https://aws.amazon.com"
      );
    });

    it("cancels edit and restores original values", () => {
      render(<ExpenditureItem source={mockSource} />);

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]); // Edit button is first
      fireEvent.change(screen.getByLabelText("Name"), {
        target: { value: "Changed Name" },
      });
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      // Should be back in display mode with original name
      expect(screen.getByText("AWS")).toBeDefined();
      expect(screen.queryByLabelText("Name")).toBeNull();
    });

    it("saves changes successfully", async () => {
      vi.mocked(updateExpenditureSource).mockResolvedValue({ success: true });

      render(<ExpenditureItem source={mockSource} />);

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]); // Edit button is first
      fireEvent.change(screen.getByLabelText("Name"), {
        target: { value: "Updated AWS" },
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /save/i }));
      });

      await waitFor(() => {
        expect(updateExpenditureSource).toHaveBeenCalledWith("exp-1", {
          name: "Updated AWS",
          baseCost: 100,
          billingCycle: "monthly",
          billingDayOfMonth: 15,
          billingMonth: null,
          consumptionCost: 50,
          detailsUrl: "https://aws.amazon.com",
          notes: "Test notes",
        });
      });
    });

    it("shows error on failed save", async () => {
      vi.mocked(updateExpenditureSource).mockResolvedValue({
        success: false,
        error: "Update failed",
      });

      render(<ExpenditureItem source={mockSource} />);

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]); // Edit button is first

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /save/i }));
      });

      await waitFor(() => {
        expect(screen.getByText("Update failed")).toBeDefined();
      });
    });

    it("shows running total while editing", () => {
      render(<ExpenditureItem source={mockSource} />);

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]); // Edit button is first

      // Original total should be shown
      expect(screen.getByText(/Total:/)).toBeDefined();
      expect(screen.getByText("$150.00")).toBeDefined();
    });

    it("clears detailsUrl when emptied", async () => {
      vi.mocked(updateExpenditureSource).mockResolvedValue({ success: true });

      render(<ExpenditureItem source={mockSource} />);

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]); // Edit button is first
      fireEvent.change(screen.getByLabelText("Details URL"), {
        target: { value: "" },
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /save/i }));
      });

      await waitFor(() => {
        expect(updateExpenditureSource).toHaveBeenCalledWith(
          "exp-1",
          expect.objectContaining({ detailsUrl: null })
        );
      });
    });

    it("handles invalid number inputs gracefully", async () => {
      vi.mocked(updateExpenditureSource).mockResolvedValue({ success: true });

      render(<ExpenditureItem source={mockSource} />);

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]); // Edit button is first
      fireEvent.change(screen.getByLabelText("Base Cost ($)"), {
        target: { value: "" },
      });
      fireEvent.change(screen.getByLabelText("Consumption ($)"), {
        target: { value: "invalid" },
      });
      fireEvent.change(screen.getByLabelText("Billing Day"), {
        target: { value: "" },
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /save/i }));
      });

      await waitFor(() => {
        expect(updateExpenditureSource).toHaveBeenCalledWith(
          "exp-1",
          expect.objectContaining({
            baseCost: 0,
            consumptionCost: 0,
            billingDayOfMonth: 1,
          })
        );
      });
    });

    it("shows default error message when error is undefined", async () => {
      vi.mocked(updateExpenditureSource).mockResolvedValue({
        success: false,
        error: undefined,
      });

      render(<ExpenditureItem source={mockSource} />);

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]); // Edit button is first

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /save/i }));
      });

      await waitFor(() => {
        expect(screen.getByText("Failed to update")).toBeDefined();
      });
    });

    it("shows billing month field when yearly cycle is selected", async () => {
      render(<ExpenditureItem source={mockSource} />);

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]); // Edit button is first

      // Billing Month should not be visible for monthly
      expect(screen.queryByLabelText("Billing Month")).toBeNull();

      // Change to yearly using combobox
      const cycleCombobox = screen.getByRole("combobox", { name: /billing cycle/i });
      fireEvent.click(cycleCombobox);

      await waitFor(() => {
        const yearlyOption = screen.getByRole("option", { name: /yearly/i });
        fireEvent.click(yearlyOption);
      });

      // Billing Month should now be visible
      await waitFor(() => {
        expect(screen.getByLabelText("Billing Month")).toBeDefined();
      });
    });

    it("hides billing month field when switching back to monthly", async () => {
      const yearlySource = {
        ...mockSource,
        billingCycle: "yearly" as const,
        billingMonth: 6,
      };
      render(<ExpenditureItem source={yearlySource} />);

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]); // Edit button is first

      // Billing Month should be visible for yearly
      expect(screen.getByLabelText("Billing Month")).toBeDefined();

      // Change back to monthly using combobox
      const cycleCombobox = screen.getByRole("combobox", { name: /billing cycle/i });
      fireEvent.click(cycleCombobox);

      await waitFor(() => {
        const monthlyOption = screen.getByRole("option", { name: /monthly/i });
        fireEvent.click(monthlyOption);
      });

      await waitFor(() => {
        expect(screen.queryByLabelText("Billing Month")).toBeNull();
      });
    });

    it("saves yearly billing with billing month", async () => {
      vi.mocked(updateExpenditureSource).mockResolvedValue({ success: true });

      render(<ExpenditureItem source={mockSource} />);

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]); // Edit button is first

      // Change to yearly using combobox
      const cycleCombobox = screen.getByRole("combobox", { name: /billing cycle/i });
      fireEvent.click(cycleCombobox);

      await waitFor(() => {
        const yearlyOption = screen.getByRole("option", { name: /yearly/i });
        fireEvent.click(yearlyOption);
      });

      // Wait for month field to appear
      await waitFor(() => {
        expect(screen.getByLabelText("Billing Month")).toBeDefined();
      });

      // Select June using combobox
      const monthCombobox = screen.getByRole("combobox", { name: /billing month/i });
      fireEvent.click(monthCombobox);

      await waitFor(() => {
        const juneOption = screen.getByRole("option", { name: /june/i });
        fireEvent.click(juneOption);
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /save/i }));
      });

      await waitFor(() => {
        expect(updateExpenditureSource).toHaveBeenCalledWith("exp-1", {
          name: "AWS",
          baseCost: 100,
          billingCycle: "yearly",
          billingDayOfMonth: 15,
          billingMonth: 6,
          consumptionCost: 50,
          detailsUrl: "https://aws.amazon.com",
          notes: "Test notes",
        });
      });
    });
  });

  describe("display mode for yearly billing", () => {
    it("shows month name for yearly billing with month", () => {
      const yearlySource = {
        ...mockSource,
        billingCycle: "yearly" as const,
        billingMonth: 3,
      };
      render(<ExpenditureItem source={yearlySource} />);

      expect(screen.getByText(/\(March 15\)/)).toBeDefined();
    });

    it("shows day only for yearly billing without month", () => {
      const yearlySource = {
        ...mockSource,
        billingCycle: "yearly" as const,
        billingMonth: null,
      };
      render(<ExpenditureItem source={yearlySource} />);

      expect(screen.getByText(/\(day 15\)/)).toBeDefined();
    });
  });

  describe("delete functionality", () => {
    it("shows delete button in display mode", () => {
      render(<ExpenditureItem source={mockSource} />);

      const buttons = screen.getAllByRole("button");
      // Should have edit and delete buttons
      expect(buttons.length).toBe(2);
    });

    it("opens confirmation dialog when clicking delete in display mode", async () => {
      render(<ExpenditureItem source={mockSource} />);

      const buttons = screen.getAllByRole("button");
      // Click the delete button (second button)
      fireEvent.click(buttons[1]);

      await waitFor(() => {
        expect(screen.getByText("Delete expenditure")).toBeDefined();
        expect(screen.getByText(/Are you sure you want to delete "AWS"\?/)).toBeDefined();
      });
    });

    it("deletes expenditure after confirmation in display mode", async () => {
      vi.mocked(deleteExpenditureSource).mockResolvedValue({ success: true });

      render(<ExpenditureItem source={mockSource} />);

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[1]);

      await waitFor(() => {
        const deleteButton = screen.getByRole("button", { name: /^delete$/i });
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(deleteExpenditureSource).toHaveBeenCalledWith("exp-1");
      });
    });

    it("cancels delete when clicking cancel in confirmation dialog", async () => {
      render(<ExpenditureItem source={mockSource} />);

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[1]);

      await waitFor(() => {
        const cancelButton = screen.getByRole("button", { name: /cancel/i });
        fireEvent.click(cancelButton);
      });

      // Dialog should be closed and delete not called
      expect(deleteExpenditureSource).not.toHaveBeenCalled();
    });

    it("shows delete button in edit mode", () => {
      render(<ExpenditureItem source={mockSource} />);

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]); // Edit button is first

      // Should have Delete, Cancel, Save buttons
      expect(screen.getByRole("button", { name: /delete/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /save/i })).toBeDefined();
    });

    it("opens confirmation dialog when clicking delete in edit mode", async () => {
      render(<ExpenditureItem source={mockSource} />);

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]); // Edit button is first
      fireEvent.click(screen.getByRole("button", { name: /delete/i }));

      await waitFor(() => {
        expect(screen.getByText("Delete expenditure")).toBeDefined();
        expect(screen.getByText(/Are you sure you want to delete "AWS"\?/)).toBeDefined();
      });
    });

    it("deletes expenditure after confirmation in edit mode", async () => {
      vi.mocked(deleteExpenditureSource).mockResolvedValue({ success: true });

      render(<ExpenditureItem source={mockSource} />);

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]); // Edit button is first
      fireEvent.click(screen.getByRole("button", { name: /delete/i }));

      await waitFor(() => {
        expect(screen.getByRole("alertdialog")).toBeDefined();
      });

      // Find and click the Delete button in the dialog
      const dialog = screen.getByRole("alertdialog");
      const dialogDeleteButton = within(dialog).getByRole("button", { name: /^Delete$/i });

      await act(async () => {
        fireEvent.click(dialogDeleteButton);
      });

      await waitFor(() => {
        expect(deleteExpenditureSource).toHaveBeenCalledWith("exp-1");
      });
    });

    it("shows error when delete fails", async () => {
      vi.mocked(deleteExpenditureSource).mockResolvedValue({
        success: false,
        error: "Delete failed",
      });

      render(<ExpenditureItem source={mockSource} />);

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]); // Edit button is first
      fireEvent.click(screen.getByRole("button", { name: /delete/i }));

      await waitFor(() => {
        expect(screen.getByRole("alertdialog")).toBeDefined();
      });

      const dialog = screen.getByRole("alertdialog");
      const dialogDeleteButton = within(dialog).getByRole("button", { name: /^Delete$/i });

      await act(async () => {
        fireEvent.click(dialogDeleteButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Delete failed")).toBeDefined();
      });
    });

    it("shows default error message when delete error is undefined", async () => {
      vi.mocked(deleteExpenditureSource).mockResolvedValue({
        success: false,
        error: undefined,
      });

      render(<ExpenditureItem source={mockSource} />);

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]); // Edit button is first
      fireEvent.click(screen.getByRole("button", { name: /delete/i }));

      await waitFor(() => {
        expect(screen.getByRole("alertdialog")).toBeDefined();
      });

      const dialog = screen.getByRole("alertdialog");
      const dialogDeleteButton = within(dialog).getByRole("button", { name: /^Delete$/i });

      await act(async () => {
        fireEvent.click(dialogDeleteButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Failed to delete")).toBeDefined();
      });
    });
  });
});
