import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PullRequest } from "../types";
import { PRItem } from "./pr-item";

describe("PRItem", () => {
  const basePR: PullRequest = {
    id: 1,
    number: 42,
    title: "Add new feature",
    htmlUrl: "https://github.com/owner/repo/pull/42",
    state: "open",
    draft: false,
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-02"),
    repository: {
      fullName: "owner/repo",
      htmlUrl: "https://github.com/owner/repo",
    },
    user: {
      login: "testuser",
      avatarUrl: "https://example.com/avatar.png",
    },
    labels: [],
  };

  it("renders PR title with repo and number", () => {
    render(<PRItem pr={basePR} />);

    expect(screen.getByText(/owner\/repo#42/)).toBeDefined();
    expect(screen.getByText(/Add new feature/)).toBeDefined();
  });

  it("renders as link to GitHub", () => {
    render(<PRItem pr={basePR} />);

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("https://github.com/owner/repo/pull/42");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("shows green icon for non-draft PR", () => {
    render(<PRItem pr={basePR} />);

    const icon = document.querySelector("svg");
    expect(icon?.classList.toString()).toContain("text-green");
  });

  it("shows muted icon for draft PR", () => {
    const draftPR = { ...basePR, draft: true };
    render(<PRItem pr={draftPR} />);

    const icon = document.querySelector("svg");
    expect(icon?.classList.toString()).toContain("text-muted");
  });

  it("renders labels when not compact", () => {
    const prWithLabels: PullRequest = {
      ...basePR,
      labels: [
        { name: "bug", color: "ff0000" },
        { name: "enhancement", color: "00ff00" },
      ],
    };

    render(<PRItem pr={prWithLabels} />);

    expect(screen.getByText("bug")).toBeDefined();
    expect(screen.getByText("enhancement")).toBeDefined();
  });

  it("hides labels when compact", () => {
    const prWithLabels: PullRequest = {
      ...basePR,
      labels: [{ name: "bug", color: "ff0000" }],
    };

    render(<PRItem pr={prWithLabels} compact />);

    expect(screen.queryByText("bug")).toBeNull();
  });

  it("limits labels to 2 when not compact", () => {
    const prWithManyLabels: PullRequest = {
      ...basePR,
      labels: [
        { name: "bug", color: "ff0000" },
        { name: "enhancement", color: "00ff00" },
        { name: "documentation", color: "0000ff" },
      ],
    };

    render(<PRItem pr={prWithManyLabels} />);

    expect(screen.getByText("bug")).toBeDefined();
    expect(screen.getByText("enhancement")).toBeDefined();
    expect(screen.queryByText("documentation")).toBeNull();
  });

  it("applies compact styling", () => {
    const { container } = render(<PRItem pr={basePR} compact />);

    const link = container.querySelector("a");
    expect(link?.classList.toString()).toContain("py-1");
  });
});
