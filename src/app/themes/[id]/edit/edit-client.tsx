"use client";

import { setActiveTheme, updateTheme } from "@/app/themes/actions";
import { useCustomTheme } from "@/components/custom-theme-provider";
import { ThemeEditor } from "@/modules/themes/components/theme-editor";
import type { ThemeVariables } from "@/lib/theme-utils";
import type { UserTheme } from "@/modules/themes/types";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

interface EditThemeClientProps {
  theme: UserTheme;
}

export function EditThemeClient({ theme }: EditThemeClientProps) {
  const router = useRouter();
  const { applyCustomTheme, activeCustomThemeId } = useCustomTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(
    async (name: string, lightVariables: ThemeVariables, darkVariables: ThemeVariables) => {
      setIsSaving(true);
      setError(null);

      const result = await updateTheme(theme.id, name, lightVariables, darkVariables);

      setIsSaving(false);

      if (!result.success) {
        setError(result.error ?? "Failed to update theme");
        return;
      }

      // If this theme is currently active, reapply it
      if (activeCustomThemeId === theme.id) {
        applyCustomTheme(theme.id, lightVariables, darkVariables);
        // Re-activate to ensure database state is correct
        await setActiveTheme(theme.id);
      }

      router.push("/themes");
    },
    [router, theme.id, activeCustomThemeId, applyCustomTheme]
  );

  const handleCancel = useCallback(() => {
    router.push("/themes");
  }, [router]);

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Edit Theme</h1>
        <p className="text-muted-foreground">
          Modify your custom theme colors
        </p>
      </div>

      <ThemeEditor
        initialName={theme.name}
        initialLightVariables={theme.light_variables}
        initialDarkVariables={theme.dark_variables}
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={isSaving}
        error={error}
        mode="edit"
      />
    </div>
  );
}
