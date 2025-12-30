"use client";

import { createTheme } from "@/app/themes/actions";
import { useCustomTheme } from "@/components/custom-theme-provider";
import { ThemeEditor } from "@/modules/themes/components/theme-editor";
import type { ThemeVariables } from "@/lib/theme-utils";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export default function NewThemePage() {
  const router = useRouter();
  const { applyCustomTheme } = useCustomTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(
    async (name: string, lightVariables: ThemeVariables, darkVariables: ThemeVariables) => {
      setIsSaving(true);
      setError(null);

      const result = await createTheme(name, lightVariables, darkVariables);

      setIsSaving(false);

      if (!result.success) {
        setError(result.error ?? "Failed to create theme");
        return;
      }

      // Apply the new theme immediately
      if (result.theme) {
        applyCustomTheme(result.theme.id, lightVariables, darkVariables);
      }

      router.push("/themes");
    },
    [router, applyCustomTheme]
  );

  const handleCancel = useCallback(() => {
    router.push("/themes");
  }, [router]);

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Create New Theme</h1>
        <p className="text-muted-foreground">
          Customize colors starting from your current theme
        </p>
      </div>

      <ThemeEditor
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={isSaving}
        error={error}
        mode="create"
      />
    </div>
  );
}
