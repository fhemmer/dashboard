import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConversationListItem } from "./conversation-list-item";

import type { ChatConversation } from "@/modules/chat/types";

const mockRouterRefresh = vi.fn();
const mockUpdateConversation = vi.fn();
const mockDeleteConversation = vi.fn();
const mockArchiveConversation = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRouterRefresh,
  }),
}));

vi.mock("@/modules/chat/actions", () => ({
  updateConversation: (...args: unknown[]) => mockUpdateConversation(...args),
  deleteConversation: (...args: unknown[]) => mockDeleteConversation(...args),
  archiveConversation: (...args: unknown[]) => mockArchiveConversation(...args),
}));

vi.mock("@/modules/chat", () => ({
  formatMessageDate: () => "Jan 2, 2024",
}));

const mockConversation: ChatConversation = {
  id: "conv-123",
  userId: "user-123",
  title: "Test Conversation",
  model: "openai/gpt-4",
  systemPrompt: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-02"),
  archivedAt: null,
};

describe("ConversationListItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateConversation.mockResolvedValue({ success: true });
    mockDeleteConversation.mockResolvedValue({ success: true });
    mockArchiveConversation.mockResolvedValue({ success: true });
  });

  it("renders conversation title and model", () => {
    render(<ConversationListItem conversation={mockConversation} />);

    expect(screen.getByText("Test Conversation")).toBeInTheDocument();
    expect(screen.getByText(/gpt-4/)).toBeInTheDocument();
  });

  it("renders 'New Chat' when title is null", () => {
    const noTitleConversation = { ...mockConversation, title: null };
    render(<ConversationListItem conversation={noTitleConversation} />);

    expect(screen.getByText("New Chat")).toBeInTheDocument();
  });

  it("links to the conversation page", () => {
    render(<ConversationListItem conversation={mockConversation} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/chat/conv-123");
  });

  it("renders formatted date", () => {
    render(<ConversationListItem conversation={mockConversation} />);

    expect(screen.getByText(/Jan 2, 2024/)).toBeInTheDocument();
  });

  it("has an actions menu button", () => {
    render(<ConversationListItem conversation={mockConversation} />);

    expect(screen.getByRole("button", { name: /actions/i })).toBeInTheDocument();
  });

  it("opens dropdown menu when actions button is clicked", async () => {
    const user = userEvent.setup();
    render(<ConversationListItem conversation={mockConversation} />);

    const menuButton = screen.getByRole("button", { name: /actions/i });
    await user.click(menuButton);

    // Menu should open with Rename, Archive, and Delete options
    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /rename/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("menuitem", { name: /archive/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /delete/i })).toBeInTheDocument();
  });

  it("archives conversation when Archive is clicked", async () => {
    const user = userEvent.setup();
    render(<ConversationListItem conversation={mockConversation} />);

    // Open menu and click Archive
    await user.click(screen.getByRole("button", { name: /actions/i }));
    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /archive/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("menuitem", { name: /archive/i }));

    await waitFor(() => {
      expect(mockArchiveConversation).toHaveBeenCalledWith("conv-123");
    });
    expect(mockRouterRefresh).toHaveBeenCalled();
  });

  it("opens rename dialog when Rename is clicked", async () => {
    const user = userEvent.setup();
    render(<ConversationListItem conversation={mockConversation} />);

    // Open menu
    await user.click(screen.getByRole("button", { name: /actions/i }));

    // Click Rename
    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /rename/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("menuitem", { name: /rename/i }));

    // Dialog should appear
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(screen.getByText("Rename conversation")).toBeInTheDocument();
  });

  it("renames conversation when form is submitted", async () => {
    const user = userEvent.setup();
    render(<ConversationListItem conversation={mockConversation} />);

    // Open menu and click Rename
    await user.click(screen.getByRole("button", { name: /actions/i }));
    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /rename/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("menuitem", { name: /rename/i }));

    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Change title and save
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "New Title");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockUpdateConversation).toHaveBeenCalledWith("conv-123", {
        title: "New Title",
      });
    });
  });

  it("opens delete confirmation when Delete is clicked", async () => {
    const user = userEvent.setup();
    render(<ConversationListItem conversation={mockConversation} />);

    // Open menu and click Delete
    await user.click(screen.getByRole("button", { name: /actions/i }));
    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /delete/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("menuitem", { name: /delete/i }));

    // Dialog should appear
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(screen.getByText("Delete conversation")).toBeInTheDocument();
  });

  it("deletes conversation when confirmed", async () => {
    const user = userEvent.setup();
    render(<ConversationListItem conversation={mockConversation} />);

    // Open menu and click Delete
    await user.click(screen.getByRole("button", { name: /actions/i }));
    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /delete/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("menuitem", { name: /delete/i }));

    // Wait for dialog and confirm delete
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Click the Delete button in the dialog (not the menu item)
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await user.click(deleteButtons.at(-1)!);

    await waitFor(() => {
      expect(mockDeleteConversation).toHaveBeenCalledWith("conv-123");
    });
  });

  it("renames conversation when Enter key is pressed", async () => {
    const user = userEvent.setup();
    render(<ConversationListItem conversation={mockConversation} />);

    // Open menu and click Rename
    await user.click(screen.getByRole("button", { name: /actions/i }));
    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /rename/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("menuitem", { name: /rename/i }));

    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Change title and press Enter
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "Renamed via Enter{Enter}");

    await waitFor(() => {
      expect(mockUpdateConversation).toHaveBeenCalledWith("conv-123", {
        title: "Renamed via Enter",
      });
    });
  });

  it("closes rename dialog when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<ConversationListItem conversation={mockConversation} />);

    // Open menu and click Rename
    await user.click(screen.getByRole("button", { name: /actions/i }));
    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /rename/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("menuitem", { name: /rename/i }));

    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Click Cancel
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    // Update should NOT have been called
    expect(mockUpdateConversation).not.toHaveBeenCalled();
  });

  it("closes delete dialog when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<ConversationListItem conversation={mockConversation} />);

    // Open menu and click Delete
    await user.click(screen.getByRole("button", { name: /actions/i }));
    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /delete/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("menuitem", { name: /delete/i }));

    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Click Cancel
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    // Delete should NOT have been called
    expect(mockDeleteConversation).not.toHaveBeenCalled();
  });

  it("sets empty title as undefined when renaming", async () => {
    const user = userEvent.setup();
    render(<ConversationListItem conversation={mockConversation} />);

    // Open menu and click Rename
    await user.click(screen.getByRole("button", { name: /actions/i }));
    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /rename/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("menuitem", { name: /rename/i }));

    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Clear input and save (empty string should become undefined)
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockUpdateConversation).toHaveBeenCalledWith("conv-123", {
        title: undefined,
      });
    });
  });
});
