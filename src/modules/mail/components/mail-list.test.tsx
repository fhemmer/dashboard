import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MailList } from "./mail-list";
import type { MailMessage } from "../types";

describe("MailList", () => {
  const mockMessages: MailMessage[] = [
    {
      id: "msg-1",
      accountId: "acc-1",
      provider: "gmail",
      subject: "First Email",
      from: { name: "John", email: "john@example.com" },
      to: [{ email: "recipient@example.com" }],
      receivedAt: new Date("2024-01-01T12:00:00Z"),
      isRead: false,
      hasAttachments: false,
      preview: "Preview 1",
    },
    {
      id: "msg-2",
      accountId: "acc-1",
      provider: "gmail",
      subject: "Second Email",
      from: { name: "Jane", email: "jane@example.com" },
      to: [{ email: "recipient@example.com" }],
      receivedAt: new Date("2024-01-02T12:00:00Z"),
      isRead: true,
      hasAttachments: true,
      preview: "Preview 2",
    },
  ];

  it("should render empty state when no messages", () => {
    render(<MailList messages={[]} />);

    expect(screen.getByText("No messages")).toBeInTheDocument();
  });

  it("should render all messages", () => {
    render(<MailList messages={mockMessages} />);

    expect(screen.getByText("First Email")).toBeInTheDocument();
    expect(screen.getByText("Second Email")).toBeInTheDocument();
  });

  it("should pass messages to MailItem components", () => {
    render(<MailList messages={mockMessages} />);

    expect(screen.getByText("John <john@example.com>")).toBeInTheDocument();
    expect(screen.getByText("Jane <jane@example.com>")).toBeInTheDocument();
  });
});
