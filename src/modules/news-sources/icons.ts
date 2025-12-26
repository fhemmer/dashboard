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
    type LucideIcon,
} from "lucide-react";
import type { BrandColor, SourceIcon } from "./types";

/**
 * Map of icon names to Lucide icon components.
 */
export const sourceIconComponents: Record<SourceIcon, LucideIcon> = {
  blocks: Blocks,
  brain: Brain,
  binary: Binary,
  "code-2": Code2,
  globe: Globe,
  mic: Mic,
  newspaper: Newspaper,
  radio: Radio,
  rocket: Rocket,
  rss: Rss,
  tv: Tv,
};

/**
 * Default icon for unknown source icons.
 */
export const defaultSourceIcon: LucideIcon = Blocks;

/**
 * Get the Lucide icon component for a source icon name.
 */
export function getSourceIcon(iconName: SourceIcon | string): LucideIcon {
  if (Object.hasOwn(sourceIconComponents, iconName)) {
    return sourceIconComponents[iconName as SourceIcon];
  }
  return defaultSourceIcon;
}

/**
 * CSS classes for brand colors with opacity variants for badges.
 */
export const brandColorClasses: Record<
  BrandColor,
  { bg: string; text: string; border: string }
> = {
  gray: {
    bg: "bg-gray-500/10",
    text: "text-gray-600 dark:text-gray-400",
    border: "border-gray-500/30",
  },
  red: {
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/30",
  },
  orange: {
    bg: "bg-orange-500/10",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-500/30",
  },
  yellow: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-600 dark:text-yellow-400",
    border: "border-yellow-500/30",
  },
  green: {
    bg: "bg-green-500/10",
    text: "text-green-600 dark:text-green-400",
    border: "border-green-500/30",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-500/30",
  },
  sky: {
    bg: "bg-sky-500/10",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-sky-500/30",
  },
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30",
  },
  violet: {
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    border: "border-violet-500/30",
  },
  fuchsia: {
    bg: "bg-fuchsia-500/10",
    text: "text-fuchsia-600 dark:text-fuchsia-400",
    border: "border-fuchsia-500/30",
  },
  rose: {
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-500/30",
  },
};

/**
 * Default brand color classes for unknown colors.
 */
export const defaultBrandColorClasses = brandColorClasses.gray;

/**
 * Get CSS classes for a brand color.
 */
export function getBrandColorClasses(
  color: BrandColor | string
): { bg: string; text: string; border: string } {
  if (Object.hasOwn(brandColorClasses, color)) {
    return brandColorClasses[color as BrandColor];
  }
  return defaultBrandColorClasses;
}
