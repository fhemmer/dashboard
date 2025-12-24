import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the actions
const mockCreateNewsSource = vi.fn();
const mockUpdateNewsSource = vi.fn();

vi.mock("../actions", () => ({
  createNewsSource: (...args: unknown[]) => mockCreateNewsSource(...args),
  updateNewsSource: (...args: unknown[]) => mockUpdateNewsSource(...args),
}));

import type { NewsSource } from "../types";
import { SourceForm } from "./source-form";

describe("SourceForm", () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateNewsSource.mockResolvedValue({ success: true, id: "new-id" });
    mockUpdateNewsSource.mockResolvedValue({ success: true });
  });

  it("renders form with all fields", () => {
    render(<SourceForm />);

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Feed URL")).toBeInTheDocument();
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    expect(screen.getByText("Icon")).toBeInTheDocument();
    expect(screen.getByText("Brand Color")).toBeInTheDocument();
    expect(screen.getByLabelText("Active")).toBeInTheDocument();
  });

  it("renders Add Source button when creating", () => {
    render(<SourceForm />);

    expect(screen.getByRole("button", { name: "Add Source" })).toBeInTheDocument();
  });

  it("renders Update Source button when editing", () => {
    const source: NewsSource = {
      id: "source-1",
      url: "https://example.com/rss",
      name: "Test Source",
      category: "tech",
      iconName: "rocket",
      brandColor: "blue",
      isActive: true,
      createdBy: "user-1",
      createdAt: new Date(),
    };

    render(<SourceForm source={source} />);

    expect(screen.getByRole("button", { name: "Update Source" })).toBeInTheDocument();
  });

  it("populates form fields when editing", () => {
    const source: NewsSource = {
      id: "source-1",
      url: "https://example.com/rss",
      name: "Test Source",
      category: "ai",
      iconName: "brain",
      brandColor: "violet",
      isActive: false,
      createdBy: "user-1",
      createdAt: new Date(),
    };

    render(<SourceForm source={source} />);

    expect(screen.getByLabelText("Name")).toHaveValue("Test Source");
    expect(screen.getByLabelText("Feed URL")).toHaveValue("https://example.com/rss");
    expect(screen.getByLabelText("Category")).toHaveValue("ai");
    expect(screen.getByLabelText("Active")).not.toBeChecked();
  });

  it("calls createNewsSource when submitting new source", async () => {
    render(<SourceForm onSuccess={mockOnSuccess} />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "New Source" },
    });
    fireEvent.change(screen.getByLabelText("Feed URL"), {
      target: { value: "https://new.com/rss" },
    });
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "dev" },
    });

    fireEvent.submit(screen.getByTestId("source-form"));

    await waitFor(() => {
      expect(mockCreateNewsSource).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Source",
          url: "https://new.com/rss",
          category: "dev",
        })
      );
    });
  });

  it("calls updateNewsSource when submitting edited source", async () => {
    const source: NewsSource = {
      id: "source-1",
      url: "https://example.com/rss",
      name: "Test Source",
      category: "tech",
      iconName: "blocks",
      brandColor: "gray",
      isActive: true,
      createdBy: "user-1",
      createdAt: new Date(),
    };

    render(<SourceForm source={source} onSuccess={mockOnSuccess} />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Updated Source" },
    });

    fireEvent.submit(screen.getByTestId("source-form"));

    await waitFor(() => {
      expect(mockUpdateNewsSource).toHaveBeenCalledWith(
        "source-1",
        expect.objectContaining({
          name: "Updated Source",
        })
      );
    });
  });

  it("calls onSuccess callback after successful creation", async () => {
    render(<SourceForm onSuccess={mockOnSuccess} />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "New Source" },
    });
    fireEvent.change(screen.getByLabelText("Feed URL"), {
      target: { value: "https://new.com/rss" },
    });

    fireEvent.submit(screen.getByTestId("source-form"));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it("calls onSuccess callback after successful update", async () => {
    const source: NewsSource = {
      id: "source-1",
      url: "https://example.com/rss",
      name: "Test Source",
      category: "tech",
      iconName: "blocks",
      brandColor: "gray",
      isActive: true,
      createdBy: "user-1",
      createdAt: new Date(),
    };

    render(<SourceForm source={source} onSuccess={mockOnSuccess} />);

    fireEvent.submit(screen.getByTestId("source-form"));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it("does not call onSuccess when creation fails", async () => {
    mockCreateNewsSource.mockResolvedValue({ success: false, error: "Failed" });

    render(<SourceForm onSuccess={mockOnSuccess} />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "New Source" },
    });
    fireEvent.change(screen.getByLabelText("Feed URL"), {
      target: { value: "https://new.com/rss" },
    });

    fireEvent.submit(screen.getByTestId("source-form"));

    await waitFor(() => {
      expect(mockCreateNewsSource).toHaveBeenCalled();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("renders Cancel button when onCancel is provided", () => {
    render(<SourceForm onCancel={mockOnCancel} />);

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("does not render Cancel button when onCancel is not provided", () => {
    render(<SourceForm />);

    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("calls onCancel when Cancel button is clicked", () => {
    render(<SourceForm onCancel={mockOnCancel} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("renders all icon options", () => {
    render(<SourceForm />);

    expect(screen.getByTestId("icon-option-blocks")).toBeInTheDocument();
    expect(screen.getByTestId("icon-option-brain")).toBeInTheDocument();
    expect(screen.getByTestId("icon-option-rocket")).toBeInTheDocument();
    expect(screen.getByTestId("icon-option-rss")).toBeInTheDocument();
  });

  it("renders all color options", () => {
    render(<SourceForm />);

    expect(screen.getByTestId("color-option-gray")).toBeInTheDocument();
    expect(screen.getByTestId("color-option-red")).toBeInTheDocument();
    expect(screen.getByTestId("color-option-blue")).toBeInTheDocument();
    expect(screen.getByTestId("color-option-violet")).toBeInTheDocument();
  });

  it("shows Saving... text while pending", async () => {
    // Make the mock return a promise that doesn't resolve immediately
    mockCreateNewsSource.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
    );

    render(<SourceForm />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "New Source" },
    });
    fireEvent.change(screen.getByLabelText("Feed URL"), {
      target: { value: "https://new.com/rss" },
    });

    fireEvent.submit(screen.getByTestId("source-form"));

    // Check for pending state
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Saving..." })).toBeInTheDocument();
    });
  });

  it("defaults icon to blocks when creating", () => {
    render(<SourceForm />);

    const blocksRadio = screen.getByTestId("icon-option-blocks").querySelector('input[type="radio"]');
    expect(blocksRadio).toBeChecked();
  });

  it("defaults color to gray when creating", () => {
    render(<SourceForm />);

    const grayRadio = screen.getByTestId("color-option-gray").querySelector('input[type="radio"]');
    expect(grayRadio).toBeChecked();
  });

  it("defaults active to true when creating", () => {
    render(<SourceForm />);

    expect(screen.getByLabelText("Active")).toBeChecked();
  });
});
