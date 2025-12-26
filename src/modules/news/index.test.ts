import { describe, expect, it } from "vitest";
import * as newsExports from "./index";

describe("news index barrel", () => {
  it("exports getNewsItems", () => {
    expect(newsExports.getNewsItems).toBeDefined();
  });

  it("exports markNewsAsRead", () => {
    expect(newsExports.markNewsAsRead).toBeDefined();
  });

  it("exports getNewsLastSeenAt", () => {
    expect(newsExports.getNewsLastSeenAt).toBeDefined();
  });

  it("exports revalidateNews", () => {
    expect(newsExports.revalidateNews).toBeDefined();
  });

  it("exports getSourcesWithExclusion", () => {
    expect(newsExports.getSourcesWithExclusion).toBeDefined();
  });

  it("exports getUserExcludedSources", () => {
    expect(newsExports.getUserExcludedSources).toBeDefined();
  });

  it("exports toggleSourceExclusion", () => {
    expect(newsExports.toggleSourceExclusion).toBeDefined();
  });

  it("exports excludeSource", () => {
    expect(newsExports.excludeSource).toBeDefined();
  });

  it("exports includeSource", () => {
    expect(newsExports.includeSource).toBeDefined();
  });

  it("exports AutoMarkAsRead", () => {
    expect(newsExports.AutoMarkAsRead).toBeDefined();
  });

  it("exports MarkAsReadButton", () => {
    expect(newsExports.MarkAsReadButton).toBeDefined();
  });

  it("exports NewsItemComponent", () => {
    expect(newsExports.NewsItemComponent).toBeDefined();
  });

  it("exports NewsWidget", () => {
    expect(newsExports.NewsWidget).toBeDefined();
  });

  it("exports RefreshButton", () => {
    expect(newsExports.RefreshButton).toBeDefined();
  });

  it("exports SourceExclusionSettings", () => {
    expect(newsExports.SourceExclusionSettings).toBeDefined();
  });
});
