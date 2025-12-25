import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock window.confirm
const mockConfirm = vi.fn();
Object.defineProperty(window, "confirm", { value: mockConfirm });

// Mock window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, "location", {
  value: { reload: mockReload },
  writable: true,
});

// Mock the actions
const mockDeleteNewsSource = vi.fn();
const mockToggleNewsSourceActive = vi.fn();

vi.mock("../actions", () => ({
  deleteNewsSource: (...args: unknown[]) => mockDeleteNewsSource(...args),
  toggleNewsSourceActive: (...args: unknown[]) => mockToggleNewsSourceActive(...args),
  createNewsSource: vi.fn().mockResolvedValue({ success: true }),
  updateNewsSource: vi.fn().mockResolvedValue({ success: true }),
}));

import type { NewsSource } from "../types";
import { SourceList } from "./source-list";

describe("SourceList", () => {
  const mockSources: NewsSource[] = [
    {
      id: "source-1",
      url: "https://example.com/rss",
      name: "Example News",
      category: "tech",
      iconName: "rocket",
      brandColor: "blue",
      isActive: true,
      createdBy: "user-123",
      createdAt: new Date(),
    },
    {
      id: "source-2",
      url: "https://other.com/rss",
      name: "Other News",
      category: "general",
      iconName: "globe",
      brandColor: "gray",
      isActive: false,
      createdBy: "user-456",
      createdAt: new Date(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockReturnValue(true);
    mockDeleteNewsSource.mockResolvedValue({ success: true });
    mockToggleNewsSourceActive.mockResolvedValue({ success: true });
  });

  it("renders source list with table", () => {
    render(
      <SourceList
        initialSources={mockSources}
        userRole="admin"
        userId="user-123"
      />
    );

    expect(screen.getByTestId("source-list")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders all sources", () => {
    render(
      <SourceList
        initialSources={mockSources}
        userRole="admin"
        userId="user-123"
      />
    );

    expect(screen.getByText("Example News")).toBeInTheDocument();
    expect(screen.getByText("Other News")).toBeInTheDocument();
  });

  it("shows empty state when no sources", () => {
    render(
      <SourceList initialSources={[]} userRole="admin" userId="user-123" />
    );

    expect(screen.getByText(/No news sources found/)).toBeInTheDocument();
  });

  it("renders Add Source button", () => {
    render(
      <SourceList
        initialSources={mockSources}
        userRole="admin"
        userId="user-123"
      />
    );

    expect(screen.getByRole("button", { name: /Add Source/i })).toBeInTheDocument();
  });

  it("opens add dialog when Add Source is clicked", async () => {
    render(
      <SourceList
        initialSources={mockSources}
        userRole="admin"
        userId="user-123"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Add Source/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Add News Source")).toBeInTheDocument();
    });
  });

  it("shows category badges", () => {
    render(
      <SourceList
        initialSources={mockSources}
        userRole="admin"
        userId="user-123"
      />
    );

    expect(screen.getByText("Tech")).toBeInTheDocument();
    expect(screen.getByText("General")).toBeInTheDocument();
  });

  it("shows status buttons", () => {
    render(
      <SourceList
        initialSources={mockSources}
        userRole="admin"
        userId="user-123"
      />
    );

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("shows edit buttons for admin on all sources", () => {
    render(
      <SourceList
        initialSources={mockSources}
        userRole="admin"
        userId="user-123"
      />
    );

    const editButtons = screen.getAllByLabelText(/Edit/);
    expect(editButtons).toHaveLength(2);
  });

  it("shows delete buttons for admin on all sources", () => {
    render(
      <SourceList
        initialSources={mockSources}
        userRole="admin"
        userId="user-123"
      />
    );

    const deleteButtons = screen.getAllByLabelText(/Delete/);
    expect(deleteButtons).toHaveLength(2);
  });

  it("news_manager only sees edit button for own sources", () => {
    render(
      <SourceList
        initialSources={mockSources}
        userRole="news_manager"
        userId="user-123"
      />
    );

    // Only source-1 is owned by user-123
    expect(screen.getByLabelText("Edit Example News")).toBeInTheDocument();
    expect(screen.queryByLabelText("Edit Other News")).not.toBeInTheDocument();
  });

  it("news_manager only sees delete button for own sources", () => {
    render(
      <SourceList
        initialSources={mockSources}
        userRole="news_manager"
        userId="user-123"
      />
    );

    expect(screen.getByLabelText("Delete Example News")).toBeInTheDocument();
    expect(screen.queryByLabelText("Delete Other News")).not.toBeInTheDocument();
  });

  it("toggles active status when clicking status button", async () => {
    render(
      <SourceList
        initialSources={mockSources}
        userRole="admin"
        userId="user-123"
      />
    );

    const activeButton = screen.getByText("Active");
    fireEvent.click(activeButton);

    await waitFor(() => {
      expect(mockToggleNewsSourceActive).toHaveBeenCalledWith("source-1", false);
    });
  });

  it("deletes source when clicking delete button after confirmation", async () => {
    render(
      <SourceList
        initialSources={mockSources}
        userRole="admin"
        userId="user-123"
      />
    );

    fireEvent.click(screen.getByLabelText("Delete Example News"));

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith(
        'Are you sure you want to delete "Example News"?'
      );
      expect(mockDeleteNewsSource).toHaveBeenCalledWith("source-1");
    });
  });

  it("does not delete source when confirmation is cancelled", async () => {
    mockConfirm.mockReturnValue(false);

    render(
      <SourceList
        initialSources={mockSources}
        userRole="admin"
        userId="user-123"
      />
    );

    fireEvent.click(screen.getByLabelText("Delete Example News"));

    expect(mockDeleteNewsSource).not.toHaveBeenCalled();
  });

  it("opens edit dialog when clicking edit button", async () => {
    render(
      <SourceList
        initialSources={mockSources}
        userRole="admin"
        userId="user-123"
      />
    );

    fireEvent.click(screen.getByLabelText("Edit Example News"));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Edit News Source")).toBeInTheDocument();
    });
  });

  it("closes edit dialog and clears editing source when dialog is closed", async () => {
    render(
      <SourceList
        initialSources={mockSources}
        userRole="admin"
        userId="user-123"
      />
    );

    // Open the edit dialog
    fireEvent.click(screen.getByLabelText("Edit Example News"));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Close by clicking cancel
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("reloads page on successful edit", async () => {
    const { updateNewsSource } = await import("../actions");
    (updateNewsSource as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ success: true });

    render(
      <SourceList
        initialSources={mockSources}
        userRole="admin"
        userId="user-123"
      />
    );

    // Open the edit dialog
    fireEvent.click(screen.getByLabelText("Edit Example News"));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Fill form and submit
    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: "Updated News" } });
    fireEvent.click(screen.getByRole("button", { name: /Update Source/i }));

    await waitFor(() => {
      expect(mockReload).toHaveBeenCalled();
    });
  });

  it("removes source from list after successful delete", async () => {
    render(
      <SourceList
        initialSources={mockSources}
        userRole="admin"
        userId="user-123"
      />
    );

    expect(screen.getByText("Example News")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Delete Example News"));

    await waitFor(() => {
      expect(screen.queryByText("Example News")).not.toBeInTheDocument();
    });
  });

  it("updates active status in UI after toggle", async () => {
    render(
      <SourceList
        initialSources={mockSources}
        userRole="admin"
        userId="user-123"
      />
    );

    // Initially source-1 is active
    const activeButtons = screen.getAllByText("Active");
    expect(activeButtons).toHaveLength(1);

    // Click to toggle
    fireEvent.click(activeButtons[0]);

    await waitFor(() => {
      // Should now show as Inactive
      expect(screen.getAllByText("Inactive")).toHaveLength(2);
    });
  });

  it("renders external link for source URL", () => {
    render(
      <SourceList
        initialSources={mockSources}
        userRole="admin"
        userId="user-123"
      />
    );

    const links = screen.getAllByRole("link");
    const externalLink = links.find((l) => l.getAttribute("href") === "https://example.com/rss");
    expect(externalLink).toBeInTheDocument();
    expect(externalLink).toHaveAttribute("target", "_blank");
    expect(externalLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("applies reduced opacity to inactive sources", () => {
    render(
      <SourceList
        initialSources={mockSources}
        userRole="admin"
        userId="user-123"
      />
    );

    const inactiveRow = screen.getByTestId("source-row-source-2");
    expect(inactiveRow.className).toContain("opacity-50");
  });

  it("does not allow news_manager to toggle status of others sources", () => {
    render(
      <SourceList
        initialSources={mockSources}
        userRole="news_manager"
        userId="user-123"
      />
    );

    // The inactive button for source-2 should be disabled/not clickable
    const inactiveButton = screen.getByText("Inactive");
    expect(inactiveButton.className).toContain("cursor-not-allowed");
  });

  it("does not update state when toggle fails", async () => {
    mockToggleNewsSourceActive.mockResolvedValue({ success: false, error: "Failed" });

    render(
      <SourceList
        initialSources={mockSources}
        userRole="admin"
        userId="user-123"
      />
    );

    const activeButton = screen.getByText("Active");
    fireEvent.click(activeButton);

    await waitFor(() => {
      expect(mockToggleNewsSourceActive).toHaveBeenCalled();
    });

    // State should not change - still one Active
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("does not remove source when delete fails", async () => {
    mockDeleteNewsSource.mockResolvedValue({ success: false, error: "Delete failed" });

    render(
      <SourceList
        initialSources={mockSources}
        userRole="admin"
        userId="user-123"
      />
    );

    fireEvent.click(screen.getByLabelText("Delete Example News"));

    await waitFor(() => {
      expect(mockDeleteNewsSource).toHaveBeenCalled();
    });

    // Source should still be present
    expect(screen.getByText("Example News")).toBeInTheDocument();
  });
});
