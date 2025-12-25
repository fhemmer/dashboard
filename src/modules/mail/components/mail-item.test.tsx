import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MailItem } from "./mail-item";
import type { MailMessage } from "../types";

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
});
