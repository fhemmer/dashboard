"use client";

import { deleteTheme, setActiveTheme } from "@/app/themes/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCustomTheme } from "@/components/custom-theme-provider";
import type { UserTheme } from "@/modules/themes/types";
import { oklchToHex } from "@/lib/color";
import { Check, Palette, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

interface ThemeListProps {
  themes: UserTheme[];
}

/**
 * List of user's custom themes with actions
 */
export function ThemeList({ themes }: ThemeListProps) {
  const router = useRouter();
  const { applyCustomTheme, clearCustomTheme, activeCustomThemeId } = useCustomTheme();

  if (themes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Palette className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No custom themes yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first custom theme to personalize your dashboard.
          </p>
          <Button asChild className="mt-4">
            <Link href="/themes/new">Create Theme</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {themes.map((theme) => (
        <ThemeCard
          key={theme.id}
          theme={theme}
          isActive={theme.id === activeCustomThemeId}
          onActivate={() => {
            applyCustomTheme(theme.id, theme.light_variables, theme.dark_variables);
          }}
          onDeactivate={clearCustomTheme}
          onDeleted={() => router.refresh()}
        />
      ))}
    </div>
  );
}

interface ThemeCardProps {
  theme: UserTheme;
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onDeleted: () => void;
}

function ThemeCard({ theme, isActive, onActivate, onDeactivate, onDeleted }: ThemeCardProps) {
  const [isPending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleActivate = useCallback(() => {
    startTransition(async () => {
      const result = await setActiveTheme(theme.id);
      if (result.success) {
        onActivate();
      }
    });
  }, [theme.id, onActivate]);

  const handleDeactivate = useCallback(() => {
    startTransition(async () => {
      const result = await setActiveTheme(null);
      if (result.success) {
        onDeactivate();
      }
    });
  }, [onDeactivate]);

  const handleDelete = useCallback(() => {
    startTransition(async () => {
      const result = await deleteTheme(theme.id);
      if (result.success) {
        if (isActive) {
          onDeactivate();
        }
        onDeleted();
      } else {
        setDeleteError(result.error ?? "Failed to delete theme");
      }
    });
  }, [theme.id, isActive, onDeactivate, onDeleted]);

  // Get preview colors from light mode variables
  const primaryHex = oklchToHex(theme.light_variables.primary) ?? "#333";
  const accentHex = oklchToHex(theme.light_variables.accent) ?? "#666";
  const bgHex = oklchToHex(theme.light_variables.background) ?? "#fff";

  return (
    <Card className={isActive ? "border-primary" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-base">
              {theme.name}
              {isActive && (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                  Active
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              Updated {new Date(theme.updated_at).toLocaleDateString()}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Color preview */}
        <div
          className="flex h-10 items-center justify-center gap-1.5 rounded-md"
          style={{ backgroundColor: bgHex }}
        >
          <div className="h-5 w-5 rounded-full" style={{ backgroundColor: primaryHex }} />
          <div className="h-5 w-5 rounded-full" style={{ backgroundColor: accentHex }} />
          <div
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: oklchToHex(theme.light_variables.secondary) ?? "#999" }}
          />
        </div>

        {/* Error */}
        {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}

        {/* Actions */}
        <div className="flex gap-2">
          {isActive ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleDeactivate}
              disabled={isPending}
            >
              Deactivate
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={handleActivate}
              disabled={isPending}
            >
              <Check className="mr-1 h-3 w-3" />
              Activate
            </Button>
          )}
          <Button variant="outline" size="icon-sm" asChild aria-label={`Edit ${theme.name}`}>
            <Link href={`/themes/${theme.id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={isPending}
                aria-label={`Delete ${theme.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete &ldquo;{theme.name}&rdquo;?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your custom theme.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isPending}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
