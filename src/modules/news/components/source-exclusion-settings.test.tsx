import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SourceExclusionSettings } from "./source-exclusion-settings";

const mockToggleSourceExclusion = vi.fn();

vi.mock("../actions", () => ({
  toggleSourceExclusion: (sourceId: string, desiredExcluded?: boolean) => mockToggleSourceExclusion(sourceId, desiredExcluded),
}));

describe("SourceExclusionSettings", () => {
  const mockSources = [
    {
      id: "source-1",
      name: "Hacker News",
      iconName: "rocket" as const,
      brandColor: "orange" as const,
      category: "tech" as const,
      isExcluded: false,
    },
    {
      id: "source-2",
      name: "BBC Tech",
      iconName: "tv" as const,
      brandColor: "rose" as const,
      category: "tech" as const,
      isExcluded: true,
    },
    {
      id: "source-3",
      name: "NPR News",
      iconName: "radio" as const,
      brandColor: "blue" as const,
      category: "general" as const,
      isExcluded: false,
    },
  ];

  beforeEach(() => {
    mockToggleSourceExclusion.mockReset();
  });

  it("renders manage sources button", () => {
    render(<SourceExclusionSettings sources={mockSources} />);

    expect(screen.getByRole("button", { name: /manage sources/i })).toBeDefined();
  });

  it("opens sheet when button is clicked", async () => {
    render(<SourceExclusionSettings sources={mockSources} />);

    const button = screen.getByRole("button", { name: /manage sources/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("News Sources")).toBeDefined();
    });
  });

  it("displays all sources when sheet is open", async () => {
    render(<SourceExclusionSettings sources={mockSources} />);

    fireEvent.click(screen.getByRole("button", { name: /manage sources/i }));

    await waitFor(() => {
      expect(screen.getByText("Hacker News")).toBeDefined();
      expect(screen.getByText("BBC Tech")).toBeDefined();
      expect(screen.getByText("NPR News")).toBeDefined();
    });
  });

  it("shows enabled count", async () => {
    render(<SourceExclusionSettings sources={mockSources} />);

    fireEvent.click(screen.getByRole("button", { name: /manage sources/i }));

    await waitFor(() => {
      expect(screen.getByText(/2 of 3 sources enabled/)).toBeDefined();
    });
  });

  it("renders category labels", async () => {
    render(<SourceExclusionSettings sources={mockSources} />);

    fireEvent.click(screen.getByRole("button", { name: /manage sources/i }));

    await waitFor(() => {
      expect(screen.getAllByText("tech")).toHaveLength(2);
      expect(screen.getByText("general")).toBeDefined();
    });
  });

  it("renders switches for each source", async () => {
    render(<SourceExclusionSettings sources={mockSources} />);

    fireEvent.click(screen.getByRole("button", { name: /manage sources/i }));

    await waitFor(() => {
      const switches = screen.getAllByRole("switch");
      expect(switches).toHaveLength(3);
    });
  });

  it("shows excluded source with correct switch state", async () => {
    render(<SourceExclusionSettings sources={mockSources} />);

    fireEvent.click(screen.getByRole("button", { name: /manage sources/i }));

    await waitFor(() => {
      const bbcSwitch = screen.getByRole("switch", { name: /toggle bbc tech/i });
      expect(bbcSwitch.getAttribute("data-state")).toBe("unchecked");
    });
  });

  it("shows included source with correct switch state", async () => {
    render(<SourceExclusionSettings sources={mockSources} />);

    fireEvent.click(screen.getByRole("button", { name: /manage sources/i }));

    await waitFor(() => {
      const hnSwitch = screen.getByRole("switch", { name: /toggle hacker news/i });
      expect(hnSwitch.getAttribute("data-state")).toBe("checked");
    });
  });

  it("calls toggleSourceExclusion when switch is clicked", async () => {
    mockToggleSourceExclusion.mockResolvedValue({ success: true, isExcluded: true });

    render(<SourceExclusionSettings sources={mockSources} />);

    fireEvent.click(screen.getByRole("button", { name: /manage sources/i }));

    await waitFor(() => {
      const hnSwitch = screen.getByRole("switch", { name: /toggle hacker news/i });
      fireEvent.click(hnSwitch);
    });

    await waitFor(() => {
      // Now passes desiredExcluded=true because the source is currently not excluded (isExcluded: false)
      expect(mockToggleSourceExclusion).toHaveBeenCalledWith("source-1", true);
    });
  });

  it("updates UI when toggle succeeds", async () => {
    mockToggleSourceExclusion.mockResolvedValue({ success: true, isExcluded: true });

    render(<SourceExclusionSettings sources={mockSources} />);

    fireEvent.click(screen.getByRole("button", { name: /manage sources/i }));

    await waitFor(() => {
      const hnSwitch = screen.getByRole("switch", { name: /toggle hacker news/i });
      expect(hnSwitch.getAttribute("data-state")).toBe("checked");
      fireEvent.click(hnSwitch);
    });

    await waitFor(() => {
      const hnSwitch = screen.getByRole("switch", { name: /toggle hacker news/i });
      expect(hnSwitch.getAttribute("data-state")).toBe("unchecked");
    });
  });

  it("shows empty message when no sources", async () => {
    render(<SourceExclusionSettings sources={[]} />);

    fireEvent.click(screen.getByRole("button", { name: /manage sources/i }));

    await waitFor(() => {
      expect(screen.getByText("No news sources available.")).toBeDefined();
    });
  });

  it("applies opacity to excluded source rows", async () => {
    render(<SourceExclusionSettings sources={mockSources} />);

    fireEvent.click(screen.getByRole("button", { name: /manage sources/i }));

    await waitFor(() => {
      const bbcRow = screen.getByTestId("source-toggle-source-2");
      expect(bbcRow.className).toContain("opacity-50");
    });
  });
});
