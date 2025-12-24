import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddExpenditureForm } from "./add-expenditure-form";

vi.mock("../actions", () => ({
  createExpenditureSource: vi.fn(),
}));

const { createExpenditureSource } = await import("../actions");

describe("AddExpenditureForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("closed state", () => {
    it("renders add button when closed", () => {
      render(<AddExpenditureForm />);

      expect(
        screen.getByRole("button", { name: /add expenditure source/i })
      ).toBeDefined();
    });

    it("does not render form fields when closed", () => {
      render(<AddExpenditureForm />);

      expect(screen.queryByLabelText("Name *")).toBeNull();
    });
  });

  describe("open state", () => {
    it("opens form when button clicked", () => {
      render(<AddExpenditureForm />);

      fireEvent.click(
        screen.getByRole("button", { name: /add expenditure source/i })
      );

      expect(screen.getByText("Add New Expenditure Source")).toBeDefined();
      expect(screen.getByLabelText("Name *")).toBeDefined();
      expect(screen.getByLabelText("Details URL")).toBeDefined();
      expect(screen.getByLabelText("Base Cost ($)")).toBeDefined();
      expect(screen.getByLabelText("Billing Cycle")).toBeDefined();
      expect(screen.getByLabelText("Billing Day")).toBeDefined();
      expect(screen.getByLabelText("Consumption ($)")).toBeDefined();
      expect(screen.getByLabelText("Notes")).toBeDefined();
    });

    it("has default values", () => {
      render(<AddExpenditureForm />);

      fireEvent.click(
        screen.getByRole("button", { name: /add expenditure source/i })
      );

      expect(screen.getByLabelText("Name *")).toHaveValue("");
      expect(screen.getByLabelText("Base Cost ($)")).toHaveValue(0);
      expect(screen.getByLabelText("Billing Day")).toHaveValue(1);
      expect(screen.getByLabelText("Consumption ($)")).toHaveValue(0);
    });

    it("closes form when cancel clicked", () => {
      render(<AddExpenditureForm />);

      fireEvent.click(
        screen.getByRole("button", { name: /add expenditure source/i })
      );
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      expect(screen.queryByText("Add New Expenditure Source")).toBeNull();
      expect(
        screen.getByRole("button", { name: /add expenditure source/i })
      ).toBeDefined();
    });

    it("has required attribute on name field", () => {
      render(<AddExpenditureForm />);

      fireEvent.click(
        screen.getByRole("button", { name: /add expenditure source/i })
      );

      const nameInput = screen.getByLabelText("Name *");
      expect(nameInput.hasAttribute("required")).toBe(true);
    });

    it("submits form with valid data", async () => {
      vi.mocked(createExpenditureSource).mockResolvedValue({
        success: true,
        id: "new-id",
      });

      render(<AddExpenditureForm />);

      fireEvent.click(
        screen.getByRole("button", { name: /add expenditure source/i })
      );
      fireEvent.change(screen.getByLabelText("Name *"), {
        target: { value: "New Service" },
      });
      fireEvent.change(screen.getByLabelText("Base Cost ($)"), {
        target: { value: "99.99" },
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /add source/i }));
      });

      await waitFor(() => {
        expect(createExpenditureSource).toHaveBeenCalledWith({
          name: "New Service",
          baseCost: 99.99,
          billingCycle: "monthly",
          billingDayOfMonth: 1,
          billingMonth: null,
          consumptionCost: 0,
          detailsUrl: null,
          notes: null,
        });
      });
    });

    it("closes form and resets on success", async () => {
      vi.mocked(createExpenditureSource).mockResolvedValue({
        success: true,
        id: "new-id",
      });

      render(<AddExpenditureForm />);

      fireEvent.click(
        screen.getByRole("button", { name: /add expenditure source/i })
      );
      fireEvent.change(screen.getByLabelText("Name *"), {
        target: { value: "New Service" },
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /add source/i }));
      });

      await waitFor(() => {
        expect(screen.queryByText("Add New Expenditure Source")).toBeNull();
      });
    });

    it("shows error message on failure", async () => {
      vi.mocked(createExpenditureSource).mockResolvedValue({
        success: false,
        error: "Database error",
      });

      render(<AddExpenditureForm />);

      fireEvent.click(
        screen.getByRole("button", { name: /add expenditure source/i })
      );
      fireEvent.change(screen.getByLabelText("Name *"), {
        target: { value: "New Service" },
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /add source/i }));
      });

      await waitFor(() => {
        expect(screen.getByText("Database error")).toBeDefined();
      });
    });

    it("submits with optional fields", async () => {
      vi.mocked(createExpenditureSource).mockResolvedValue({
        success: true,
        id: "new-id",
      });

      render(<AddExpenditureForm />);

      fireEvent.click(
        screen.getByRole("button", { name: /add expenditure source/i })
      );
      fireEvent.change(screen.getByLabelText("Name *"), {
        target: { value: "Premium Service" },
      });
      fireEvent.change(screen.getByLabelText("Details URL"), {
        target: { value: "https://example.com" },
      });
      fireEvent.change(screen.getByLabelText("Consumption ($)"), {
        target: { value: "25.50" },
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /add source/i }));
      });

      await waitFor(() => {
        expect(createExpenditureSource).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Premium Service",
            detailsUrl: "https://example.com",
            consumptionCost: 25.5,
          })
        );
      });
    });

    it("resets form when reopened", async () => {
      vi.mocked(createExpenditureSource).mockResolvedValue({
        success: true,
        id: "new-id",
      });

      render(<AddExpenditureForm />);

      // Open and fill form
      fireEvent.click(
        screen.getByRole("button", { name: /add expenditure source/i })
      );
      fireEvent.change(screen.getByLabelText("Name *"), {
        target: { value: "Test Service" },
      });

      // Submit
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /add source/i }));
      });

      // Reopen
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add expenditure source/i })
        ).toBeDefined();
      });

      fireEvent.click(
        screen.getByRole("button", { name: /add expenditure source/i })
      );

      // Should be reset
      expect(screen.getByLabelText("Name *")).toHaveValue("");
    });

    it("shows billing month field when yearly cycle is selected", async () => {
      render(<AddExpenditureForm />);

      fireEvent.click(
        screen.getByRole("button", { name: /add expenditure source/i })
      );

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
      render(<AddExpenditureForm />);

      fireEvent.click(
        screen.getByRole("button", { name: /add expenditure source/i })
      );

      // Change to yearly first
      const cycleCombobox = screen.getByRole("combobox", { name: /billing cycle/i });
      fireEvent.click(cycleCombobox);

      await waitFor(() => {
        const yearlyOption = screen.getByRole("option", { name: /yearly/i });
        fireEvent.click(yearlyOption);
      });

      await waitFor(() => {
        expect(screen.getByLabelText("Billing Month")).toBeDefined();
      });

      // Change back to monthly
      const cycleCombobox2 = screen.getByRole("combobox", { name: /billing cycle/i });
      fireEvent.click(cycleCombobox2);

      await waitFor(() => {
        const monthlyOption = screen.getByRole("option", { name: /monthly/i });
        fireEvent.click(monthlyOption);
      });

      await waitFor(() => {
        expect(screen.queryByLabelText("Billing Month")).toBeNull();
      });
    });

    it("submits yearly billing with billing month", async () => {
      vi.mocked(createExpenditureSource).mockResolvedValue({
        success: true,
        id: "new-id",
      });

      render(<AddExpenditureForm />);

      fireEvent.click(
        screen.getByRole("button", { name: /add expenditure source/i })
      );
      fireEvent.change(screen.getByLabelText("Name *"), {
        target: { value: "Annual Service" },
      });
      fireEvent.change(screen.getByLabelText("Base Cost ($)"), {
        target: { value: "120" },
      });

      // Change to yearly
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

      // Select March
      const monthCombobox = screen.getByRole("combobox", { name: /billing month/i });
      fireEvent.click(monthCombobox);

      await waitFor(() => {
        const marchOption = screen.getByRole("option", { name: /march/i });
        fireEvent.click(marchOption);
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /add source/i }));
      });

      await waitFor(() => {
        expect(createExpenditureSource).toHaveBeenCalledWith({
          name: "Annual Service",
          baseCost: 120,
          billingCycle: "yearly",
          billingDayOfMonth: 1,
          billingMonth: 3,
          consumptionCost: 0,
          detailsUrl: null,
          notes: null,
        });
      });
    });

    it("clears billing month when switching to monthly", async () => {
      vi.mocked(createExpenditureSource).mockResolvedValue({
        success: true,
        id: "new-id",
      });

      render(<AddExpenditureForm />);

      fireEvent.click(
        screen.getByRole("button", { name: /add expenditure source/i })
      );
      fireEvent.change(screen.getByLabelText("Name *"), {
        target: { value: "Test Service" },
      });

      // Change to yearly and select a month
      const cycleCombobox = screen.getByRole("combobox", { name: /billing cycle/i });
      fireEvent.click(cycleCombobox);

      await waitFor(() => {
        const yearlyOption = screen.getByRole("option", { name: /yearly/i });
        fireEvent.click(yearlyOption);
      });

      await waitFor(() => {
        expect(screen.getByLabelText("Billing Month")).toBeDefined();
      });

      // Select a month
      const monthCombobox = screen.getByRole("combobox", { name: /billing month/i });
      fireEvent.click(monthCombobox);

      await waitFor(() => {
        const juneOption = screen.getByRole("option", { name: /june/i });
        fireEvent.click(juneOption);
      });

      // Switch back to monthly
      const cycleCombobox2 = screen.getByRole("combobox", { name: /billing cycle/i });
      fireEvent.click(cycleCombobox2);

      await waitFor(() => {
        const monthlyOption = screen.getByRole("option", { name: /monthly/i });
        fireEvent.click(monthlyOption);
      });

      // Submit form
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /add source/i }));
      });

      await waitFor(() => {
        expect(createExpenditureSource).toHaveBeenCalledWith(
          expect.objectContaining({
            billingCycle: "monthly",
            billingMonth: null,
          })
        );
      });
    });

    it("shows default error message when error is undefined", async () => {
      vi.mocked(createExpenditureSource).mockResolvedValue({
        success: false,
        error: undefined,
      });

      render(<AddExpenditureForm />);

      fireEvent.click(
        screen.getByRole("button", { name: /add expenditure source/i })
      );
      fireEvent.change(screen.getByLabelText("Name *"), {
        target: { value: "Test Service" },
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /add source/i }));
      });

      await waitFor(() => {
        expect(screen.getByText("Failed to create")).toBeDefined();
      });
    });

    it("shows validation error when name is empty", async () => {
      render(<AddExpenditureForm />);

      fireEvent.click(
        screen.getByRole("button", { name: /add expenditure source/i })
      );

      // Leave name empty and submit the form
      const form = screen.getByRole("button", { name: /add source/i }).closest("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("Name is required")).toBeDefined();
      });

      // Should not call createExpenditureSource
      expect(createExpenditureSource).not.toHaveBeenCalled();
    });

    it("shows validation error when name is whitespace only", async () => {
      render(<AddExpenditureForm />);

      fireEvent.click(
        screen.getByRole("button", { name: /add expenditure source/i })
      );

      // Set name to whitespace only
      fireEvent.change(screen.getByLabelText("Name *"), {
        target: { value: "   " },
      });

      const form = screen.getByRole("button", { name: /add source/i }).closest("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("Name is required")).toBeDefined();
      });

      expect(createExpenditureSource).not.toHaveBeenCalled();
    });
  });
});
