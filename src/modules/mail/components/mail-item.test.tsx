import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MailMessage } from "../types";
import { MailItem } from "./mail-item";

describe("MailItem", () => {
  const mockMessage: MailMessage = {
    id: "msg-1",
    accountId: "acc-1",
    provider: "gmail",
    subject: "Test Email",
    from: {
      name: "John Doe",
      email: "john@example.com",
    },
    to: [
      {
        email: "recipient@example.com",
      },
    ],
    receivedAt: new Date("2024-01-01T12:00:00Z"),
    isRead: false,
    hasAttachments: false,
    preview: "This is a preview of the email content...",
  };

  it("should render message details", () => {
    render(<MailItem message={mockMessage} />);

    expect(screen.getByText("John Doe <john@example.com>")).toBeInTheDocument();
    expect(screen.getByText("Test Email")).toBeInTheDocument();
    expect(screen.getByText("This is a preview of the email content...")).toBeInTheDocument();
  });

  it("should display (No subject) for empty subject", () => {
    const messageWithoutSubject = {
      ...mockMessage,
      subject: "",
    };

    render(<MailItem message={messageWithoutSubject} />);

    expect(screen.getByText("(No subject)")).toBeInTheDocument();
  });

  it("should show attachments indicator when hasAttachments is true", () => {
    const messageWithAttachments = {
      ...mockMessage,
      hasAttachments: true,
    };

    render(<MailItem message={messageWithAttachments} />);

    expect(screen.getByText("Has attachments")).toBeInTheDocument();
  });

  it("should not show attachments indicator when hasAttachments is false", () => {
    render(<MailItem message={mockMessage} />);

    expect(screen.queryByText("Has attachments")).not.toBeInTheDocument();
  });

  it("should apply different styles for read vs unread", () => {
    const { container: readContainer } = render(
      <MailItem message={{ ...mockMessage, isRead: true }} />
    );

    const { container: unreadContainer } = render(
      <MailItem message={{ ...mockMessage, isRead: false }} />
    );

    // Check that they have different styling classes
    expect(readContainer.innerHTML).not.toBe(unreadContainer.innerHTML);
  });

  describe("selection", () => {
    it("should call onSelect when clicked", () => {
      const onSelect = vi.fn();
      render(<MailItem message={mockMessage} onSelect={onSelect} />);

      fireEvent.click(screen.getByRole("button"));

      expect(onSelect).toHaveBeenCalledWith("msg-1");
    });

    it("should call onSelect when Enter key is pressed", () => {
      const onSelect = vi.fn();
      render(<MailItem message={mockMessage} onSelect={onSelect} />);

      fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });

      expect(onSelect).toHaveBeenCalledWith("msg-1");
    });

    it("should call onSelect when Space key is pressed", () => {
      const onSelect = vi.fn();
      render(<MailItem message={mockMessage} onSelect={onSelect} />);

      fireEvent.keyDown(screen.getByRole("button"), { key: " " });

      expect(onSelect).toHaveBeenCalledWith("msg-1");
    });

    it("should not call onSelect for other keys", () => {
      const onSelect = vi.fn();
      render(<MailItem message={mockMessage} onSelect={onSelect} />);

      fireEvent.keyDown(screen.getByRole("button"), { key: "Escape" });

      expect(onSelect).not.toHaveBeenCalled();
    });

    it("should not throw when clicked without onSelect handler", () => {
      render(<MailItem message={mockMessage} />);

      expect(() => {
        fireEvent.click(screen.getByRole("button"));
      }).not.toThrow();
    });

    it("should apply selected styling when isSelected is true", () => {
      render(<MailItem message={mockMessage} isSelected={true} />);

      const button = screen.getByRole("button");
      expect(button.className).toContain("ring-2");
      expect(button.className).toContain("ring-primary");
    });

    it("should not apply selected styling when isSelected is false", () => {
      render(<MailItem message={mockMessage} isSelected={false} />);

      const button = screen.getByRole("button");
      expect(button.className).not.toContain("ring-2");
    });
  });

  it("should render sender email only when no name is provided", () => {
    const messageWithoutName = {
      ...mockMessage,
      from: { email: "sender@example.com" },
    };

    render(<MailItem message={messageWithoutName} />);

    expect(screen.getByText("sender@example.com")).toBeInTheDocument();
  });
});
