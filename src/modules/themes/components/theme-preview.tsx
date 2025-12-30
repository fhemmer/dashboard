"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ThemeVariables } from "@/lib/theme-utils";
import { useMemo } from "react";

interface ThemePreviewCardProps {
  variables: ThemeVariables;
  className?: string;
}

/**
 * A preview card that shows how theme colors will look.
 * Uses inline CSS variable overrides to preview without affecting the page.
 */
export function ThemePreviewCard({ variables, className }: ThemePreviewCardProps) {
  // Convert variables to CSS custom property style object
  const style = useMemo(() => {
    const cssVars: Record<string, string> = {};
    for (const [name, value] of Object.entries(variables)) {
      cssVars[`--${name}`] = value;
    }
    return cssVars;
  }, [variables]);

  return (
    <div
      className={className}
      style={style}
    >
      <Card className="overflow-hidden">
        <CardHeader className="border-b">
          <CardTitle>Preview Card</CardTitle>
          <CardDescription>This shows how your theme will look</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {/* Button row */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm">Primary</Button>
            <Button size="sm" variant="secondary">Secondary</Button>
            <Button size="sm" variant="destructive">Destructive</Button>
            <Button size="sm" variant="outline">Outline</Button>
          </div>

          {/* Input preview */}
          <Input placeholder="Sample input field" />

          {/* Muted text */}
          <p className="text-sm text-muted-foreground">
            This is muted text for less important information.
          </p>

          {/* Chart colors */}
          <div className="space-y-2">
            <p className="text-xs font-medium">Chart Colors</p>
            <div className="flex gap-1">
              <div
                className="h-6 w-6 rounded-full"
                style={{ backgroundColor: "oklch(var(--chart-1))" }}
              />
              <div
                className="h-6 w-6 rounded-full"
                style={{ backgroundColor: "oklch(var(--chart-2))" }}
              />
              <div
                className="h-6 w-6 rounded-full"
                style={{ backgroundColor: "oklch(var(--chart-3))" }}
              />
              <div
                className="h-6 w-6 rounded-full"
                style={{ backgroundColor: "oklch(var(--chart-4))" }}
              />
              <div
                className="h-6 w-6 rounded-full"
                style={{ backgroundColor: "oklch(var(--chart-5))" }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sidebar preview */}
      <div className="mt-4 rounded-lg border p-3" style={{ backgroundColor: "oklch(var(--sidebar))" }}>
        <p className="text-xs font-medium" style={{ color: "oklch(var(--sidebar-foreground))" }}>
          Sidebar Preview
        </p>
        <div className="mt-2 space-y-1">
          <div
            className="rounded px-2 py-1 text-xs"
            style={{
              backgroundColor: "oklch(var(--sidebar-primary))",
              color: "oklch(var(--sidebar-primary-foreground))",
            }}
          >
            Active Item
          </div>
          <div
            className="rounded px-2 py-1 text-xs"
            style={{
              backgroundColor: "oklch(var(--sidebar-accent))",
              color: "oklch(var(--sidebar-accent-foreground))",
            }}
          >
            Hover Item
          </div>
        </div>
      </div>
    </div>
  );
}

interface MiniThemePreviewProps {
  variables: ThemeVariables;
  className?: string;
}

/**
 * A compact theme preview for list views
 */
export function MiniThemePreview({ variables, className }: MiniThemePreviewProps) {
  return (
    <div className={`flex h-8 w-full items-center justify-center gap-1 rounded ${className}`}>
      <div
        className="h-4 w-4 rounded-full"
        style={{ backgroundColor: variables.primary }}
      />
      <div
        className="h-4 w-4 rounded-full"
        style={{ backgroundColor: variables.accent }}
      />
      <div
        className="h-3 w-3 rounded-full"
        style={{ backgroundColor: variables.secondary }}
      />
    </div>
  );
}
