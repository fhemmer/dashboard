import {
    Binary,
    Blocks,
    Brain,
    Code2,
    Globe,
    Mic,
    Newspaper,
    Radio,
    Rocket,
    Rss,
    Tv,
} from "lucide-react";
import { describe, expect, it } from "vitest";
import {
    brandColorClasses,
    defaultBrandColorClasses,
    defaultSourceIcon,
    getBrandColorClasses,
    getSourceIcon,
    sourceIconComponents,
} from "./icons";

describe("icons", () => {
  describe("sourceIconComponents", () => {
    it("should contain all expected icons", () => {
      expect(sourceIconComponents.blocks).toBe(Blocks);
      expect(sourceIconComponents.brain).toBe(Brain);
      expect(sourceIconComponents.binary).toBe(Binary);
      expect(sourceIconComponents["code-2"]).toBe(Code2);
      expect(sourceIconComponents.globe).toBe(Globe);
      expect(sourceIconComponents.mic).toBe(Mic);
      expect(sourceIconComponents.newspaper).toBe(Newspaper);
      expect(sourceIconComponents.radio).toBe(Radio);
      expect(sourceIconComponents.rocket).toBe(Rocket);
      expect(sourceIconComponents.rss).toBe(Rss);
      expect(sourceIconComponents.tv).toBe(Tv);
    });

    it("should have all 11 source icons defined", () => {
      expect(Object.keys(sourceIconComponents)).toHaveLength(11);
    });
  });

  describe("defaultSourceIcon", () => {
    it("should be the Blocks icon", () => {
      expect(defaultSourceIcon).toBe(Blocks);
    });
  });

  describe("getSourceIcon", () => {
    it("should return correct icon for valid icon names", () => {
      expect(getSourceIcon("rocket")).toBe(Rocket);
      expect(getSourceIcon("brain")).toBe(Brain);
      expect(getSourceIcon("newspaper")).toBe(Newspaper);
      expect(getSourceIcon("code-2")).toBe(Code2);
    });

    it("should return default icon for unknown icon names", () => {
      expect(getSourceIcon("unknown")).toBe(Blocks);
      expect(getSourceIcon("invalid-icon")).toBe(Blocks);
      expect(getSourceIcon("")).toBe(Blocks);
    });
  });

  describe("brandColorClasses", () => {
    it("should contain all expected brand colors", () => {
      const expectedColors = [
        "gray",
        "red",
        "orange",
        "yellow",
        "green",
        "emerald",
        "cyan",
        "sky",
        "blue",
        "violet",
        "fuchsia",
        "rose",
      ];
      expect(Object.keys(brandColorClasses)).toEqual(expectedColors);
    });

    it("should have bg, text, and border properties for each color", () => {
      for (const color of Object.values(brandColorClasses)) {
        expect(color).toHaveProperty("bg");
        expect(color).toHaveProperty("text");
        expect(color).toHaveProperty("border");
        expect(typeof color.bg).toBe("string");
        expect(typeof color.text).toBe("string");
        expect(typeof color.border).toBe("string");
      }
    });

    it("should have correct classes for orange", () => {
      expect(brandColorClasses.orange.bg).toBe("bg-orange-500/10");
      expect(brandColorClasses.orange.text).toBe(
        "text-orange-600 dark:text-orange-400"
      );
      expect(brandColorClasses.orange.border).toBe("border-orange-500/30");
    });
  });

  describe("defaultBrandColorClasses", () => {
    it("should be the gray color classes", () => {
      expect(defaultBrandColorClasses).toBe(brandColorClasses.gray);
    });
  });

  describe("getBrandColorClasses", () => {
    it("should return correct classes for valid brand colors", () => {
      expect(getBrandColorClasses("orange")).toBe(brandColorClasses.orange);
      expect(getBrandColorClasses("violet")).toBe(brandColorClasses.violet);
      expect(getBrandColorClasses("rose")).toBe(brandColorClasses.rose);
    });

    it("should return default classes for unknown colors", () => {
      expect(getBrandColorClasses("unknown")).toBe(defaultBrandColorClasses);
      expect(getBrandColorClasses("invalid")).toBe(defaultBrandColorClasses);
      expect(getBrandColorClasses("")).toBe(defaultBrandColorClasses);
    });
  });
});
