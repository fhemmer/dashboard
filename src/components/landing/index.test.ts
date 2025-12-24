import { describe, expect, it } from "vitest";
import * as landingExports from "./index";

describe("landing index barrel", () => {
  it("exports AuthLayout", () => {
    expect(landingExports.AuthLayout).toBeDefined();
  });

  it("exports CTASection", () => {
    expect(landingExports.CTASection).toBeDefined();
  });

  it("exports FeatureSection", () => {
    expect(landingExports.FeatureSection).toBeDefined();
  });

  it("exports FloatingWidgets", () => {
    expect(landingExports.FloatingWidgets).toBeDefined();
  });

  it("exports HeroSection", () => {
    expect(landingExports.HeroSection).toBeDefined();
  });

  it("exports LandingFooter", () => {
    expect(landingExports.LandingFooter).toBeDefined();
  });

  it("exports LandingPage", () => {
    expect(landingExports.LandingPage).toBeDefined();
  });
});
