/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

// We need to import the module fresh with window undefined
// Since we're in node environment, window is undefined by default

describe("Theme utilities in server environment", () => {
  it("getStoredTheme returns null when window is undefined", async () => {
    // Dynamically import to get fresh module in node environment
    const { getStoredTheme } = await import("./header");
    expect(getStoredTheme()).toBeNull();
  });

  it("getSystemTheme returns dark when window is undefined", async () => {
    const { getSystemTheme } = await import("./header");
    expect(getSystemTheme()).toBe("dark");
  });
});
