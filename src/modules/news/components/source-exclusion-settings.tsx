"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  defaultSourceIcon,
  getBrandColorClasses,
  sourceIconComponents,
} from "@/modules/news-sources";
import { Settings2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toggleSourceExclusion } from "../actions";
import type { NewsSourceWithExclusion } from "../types";

interface SourceExclusionSettingsProps {
  readonly sources: NewsSourceWithExclusion[];
}

/** Update a source's exclusion status in the sources array */
function updateSourceExclusionStatus(
  sources: NewsSourceWithExclusion[],
  sourceId: string,
  isExcluded: boolean
): NewsSourceWithExclusion[] {
  return sources.map((s) =>
    s.id === sourceId ? { ...s, isExcluded } : s
  );
}

export function SourceExclusionSettings({
  sources: initialSources,
}: SourceExclusionSettingsProps) {
  const [sources, setSources] = useState(initialSources);
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = (sourceId: string, currentlyExcluded: boolean) => {
    // Pass desired state explicitly to prevent race conditions from rapid clicks
    const desiredExcluded = !currentlyExcluded;
    startTransition(async () => {
      const result = await toggleSourceExclusion(sourceId, desiredExcluded);
      if (result.success) {
        setSources((prev) => updateSourceExclusionStatus(prev, sourceId, result.isExcluded));
      }
    });
  };

  const enabledCount = sources.filter((s) => !s.isExcluded).length;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" />
          Manage Sources
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>News Sources</SheetTitle>
          <SheetDescription>
            Choose which sources appear in your news feed.
            {enabledCount} of {sources.length} sources enabled.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4" data-testid="source-exclusion-list">
          {sources.map((source) => (
            <SourceToggleRow
              key={source.id}
              source={source}
              isPending={isPending}
              onToggle={() => handleToggle(source.id, source.isExcluded)}
            />
          ))}
          {sources.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No news sources available.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface SourceToggleRowProps {
  readonly source: NewsSourceWithExclusion;
  readonly isPending: boolean;
  readonly onToggle: () => void;
}

function SourceToggleRow({
  source,
  isPending,
  onToggle,
}: SourceToggleRowProps) {
  const IconComponent =
    sourceIconComponents[source.iconName] ?? defaultSourceIcon;
  const colorClasses = getBrandColorClasses(source.brandColor);

  return (
    <div
      className={`flex items-center justify-between py-2 ${source.isExcluded ? "opacity-50" : ""}`}
      data-testid={`source-toggle-${source.id}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-1.5 rounded-md ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border} border`}
        >
          <IconComponent className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium">{source.name}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {source.category}
          </p>
        </div>
      </div>
      <Switch
        checked={!source.isExcluded}
        onCheckedChange={onToggle}
        disabled={isPending}
        aria-label={`Toggle ${source.name}`}
      />
    </div>
  );
}
