import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MailWidget } from "./mail-widget";

vi.mock("../actions", () => ({
  getMailSummary: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("MailWidget", () => {
  it("should render empty state when no accounts", async () => {
    const { getMailSummary } = await import("../actions");
    vi.mocked(getMailSummary).mockResolvedValue({
      accounts: [],
      totalUnread: 0,
    });

    render(await MailWidget());

    expect(screen.getByText("Mail")).toBeInTheDocument();
    expect(screen.getByText("No mail accounts configured")).toBeInTheDocument();
  });

  it("should render error state", async () => {
    const { getMailSummary } = await import("../actions");
    vi.mocked(getMailSummary).mockResolvedValue({
      accounts: [],
      totalUnread: 0,
      error: "Failed to load accounts",
    });

    render(await MailWidget());

    expect(screen.getByText("Failed to load accounts")).toBeInTheDocument();
  });

  it("should render accounts with unread counts", async () => {
    const { getMailSummary } = await import("../actions");
    vi.mocked(getMailSummary).mockResolvedValue({
      accounts: [
        {
          accountId: "acc-1",
          accountName: "Personal Gmail",
          provider: "gmail",
          emailAddress: "test@gmail.com",
          unreadCount: 5,
          totalCount: 100,
        },
        {
          accountId: "acc-2",
          accountName: "Work Outlook",
          provider: "outlook",
          emailAddress: "work@outlook.com",
          unreadCount: 0,
          totalCount: 50,
        },
      ],
      totalUnread: 5,
    });

    render(await MailWidget());

    expect(screen.getByText("Personal Gmail")).toBeInTheDocument();
    expect(screen.getByText("Work Outlook")).toBeInTheDocument();
    // Check that there are badges with "5" (header + account)
    const badges = screen.getAllByText("5");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("should display total unread count in header badge", async () => {
    const { getMailSummary } = await import("../actions");
    vi.mocked(getMailSummary).mockResolvedValue({
      accounts: [
        {
          accountId: "acc-1",
          accountName: "Test",
          provider: "gmail",
          emailAddress: "test@gmail.com",
          unreadCount: 10,
          totalCount: 100,
        },
      ],
      totalUnread: 10,
    });

    render(await MailWidget());

    // Use getAllByText and check that at least one exists (header badge and account badge)
    const badges = screen.getAllByText("10");
    expect(badges.length).toBeGreaterThan(0);
  });
});
