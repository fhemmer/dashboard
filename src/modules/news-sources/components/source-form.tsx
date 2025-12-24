"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useTransition } from "react";
import { createNewsSource, updateNewsSource } from "../actions";
import type {
    BrandColor,
    NewsSource,
    NewsSourceCategory,
    NewsSourceInput,
    SourceIcon,
} from "../types";
import { BRAND_COLORS, SOURCE_ICONS } from "../types";

const iconComponents: Record<SourceIcon, LucideIcon> = {
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

const colorStyles: Record<BrandColor, string> = {
  gray: "bg-gray-500",
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  emerald: "bg-emerald-500",
  cyan: "bg-cyan-500",
  sky: "bg-sky-500",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  fuchsia: "bg-fuchsia-500",
  rose: "bg-rose-500",
};

interface SourceFormProps {
  source?: NewsSource;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SourceForm({ source, onSuccess, onCancel }: SourceFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!source;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const input: NewsSourceInput = {
      url: formData.get("url") as string,
      name: formData.get("name") as string,
      category: formData.get("category") as NewsSourceCategory,
      iconName: formData.get("iconName") as SourceIcon,
      brandColor: formData.get("brandColor") as BrandColor,
      isActive: formData.get("isActive") === "true",
    };

    startTransition(async () => {
      const result = isEditing
        ? await updateNewsSource(source.id, input)
        : await createNewsSource(input);

      if (result.success) {
        onSuccess?.();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="source-form">
      {/* Name */}
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={source?.name ?? ""}
          placeholder="e.g., Hacker News"
          disabled={isPending}
        />
      </div>

      {/* URL */}
      <div className="space-y-2">
        <label htmlFor="url" className="text-sm font-medium">
          Feed URL
        </label>
        <Input
          id="url"
          name="url"
          type="url"
          required
          defaultValue={source?.url ?? ""}
          placeholder="https://example.com/rss.xml"
          disabled={isPending}
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <label htmlFor="category" className="text-sm font-medium">
          Category
        </label>
        <select
          id="category"
          name="category"
          defaultValue={source?.category ?? "tech"}
          disabled={isPending}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="tech">Tech</option>
          <option value="general">General</option>
          <option value="ai">AI</option>
          <option value="dev">Development</option>
        </select>
      </div>

      {/* Icon Picker */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Icon</label>
        <div className="grid grid-cols-6 gap-2">
          {SOURCE_ICONS.map((icon) => {
            const IconComponent = iconComponents[icon];
            return (
              <label
                key={icon}
                className="flex items-center justify-center"
                data-testid={`icon-option-${icon}`}
              >
                <input
                  type="radio"
                  name="iconName"
                  value={icon}
                  defaultChecked={source?.iconName === icon || (!source && icon === "blocks")}
                  className="sr-only peer"
                  disabled={isPending}
                />
                <div className="p-2 rounded-md border-2 cursor-pointer peer-checked:border-primary peer-checked:bg-primary/10 hover:bg-muted transition-colors">
                  <IconComponent className="h-5 w-5" />
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Color Picker */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Brand Color</label>
        <div className="grid grid-cols-6 gap-2">
          {BRAND_COLORS.map((color) => (
            <label
              key={color}
              className="flex items-center justify-center"
              data-testid={`color-option-${color}`}
            >
              <input
                type="radio"
                name="brandColor"
                value={color}
                defaultChecked={source?.brandColor === color || (!source && color === "gray")}
                className="sr-only peer"
                disabled={isPending}
              />
              <div className="p-1 rounded-md border-2 cursor-pointer peer-checked:border-primary hover:opacity-80 transition-opacity">
                <div className={`h-6 w-6 rounded ${colorStyles[color]}`} />
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Active Status */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          name="isActive"
          value="true"
          defaultChecked={source?.isActive ?? true}
          disabled={isPending}
          className="h-4 w-4 rounded border-input"
        />
        <label htmlFor="isActive" className="text-sm font-medium">
          Active
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : getSubmitButtonText(isEditing)}
        </Button>
      </div>
    </form>
  );
}

function getSubmitButtonText(isEditing: boolean): string {
  return isEditing ? "Update Source" : "Add Source";
}
