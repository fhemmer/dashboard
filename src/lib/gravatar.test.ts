import { describe, expect, it } from "vitest";
import { getGravatarUrl } from "./gravatar";

describe("getGravatarUrl", () => {
  it("generates a valid gravatar URL", () => {
    const url = getGravatarUrl("test@example.com");

    expect(url).toMatch(/^https:\/\/www\.gravatar\.com\/avatar\/[a-f0-9]{32}\?/);
  });

  it("generates consistent hash for same email", () => {
    const url1 = getGravatarUrl("test@example.com");
    const url2 = getGravatarUrl("test@example.com");

    expect(url1).toBe(url2);
  });

  it("normalizes email to lowercase", () => {
    const url1 = getGravatarUrl("Test@Example.com");
    const url2 = getGravatarUrl("test@example.com");

    expect(url1).toBe(url2);
  });

  it("trims whitespace from email", () => {
    const url1 = getGravatarUrl("  test@example.com  ");
    const url2 = getGravatarUrl("test@example.com");

    expect(url1).toBe(url2);
  });

  it("uses default size of 80", () => {
    const url = getGravatarUrl("test@example.com");

    expect(url).toContain("s=80");
  });

  it("uses custom size when provided", () => {
    const url = getGravatarUrl("test@example.com", { size: 200 });

    expect(url).toContain("s=200");
  });

  it("uses mp as default image by default", () => {
    const url = getGravatarUrl("test@example.com");

    expect(url).toContain("d=mp");
  });

  it("uses custom default image when provided", () => {
    const url = getGravatarUrl("test@example.com", { defaultImage: "identicon" });

    expect(url).toContain("d=identicon");
  });

  it("uses g rating by default", () => {
    const url = getGravatarUrl("test@example.com");

    expect(url).toContain("r=g");
  });

  it("uses custom rating when provided", () => {
    const url = getGravatarUrl("test@example.com", { rating: "pg" });

    expect(url).toContain("r=pg");
  });

  it("generates correct MD5 hash for known email", () => {
    // Known MD5 hash for "test@example.com" is 55502f40dc8b7c769880b10874abc9d0
    const url = getGravatarUrl("test@example.com");

    expect(url).toContain("55502f40dc8b7c769880b10874abc9d0");
  });

  it("combines multiple options correctly", () => {
    const url = getGravatarUrl("test@example.com", {
      size: 128,
      defaultImage: "robohash",
      rating: "r",
    });

    expect(url).toContain("s=128");
    expect(url).toContain("d=robohash");
    expect(url).toContain("r=r");
  });
});
