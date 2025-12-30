"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  extractCurrentThemeVariables,
  THEME_VARIABLE_GROUPS,
  THEME_VARIABLE_LABELS,
  type ThemeVariableName,
  type ThemeVariables,
} from "@/lib/theme-utils";
import { ChevronDown, Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ColorPicker } from "./color-picker";
import { ThemePreviewCard } from "./theme-preview";

interface ThemeEditorProps {
  initialName?: string;
  initialLightVariables?: ThemeVariables;
  initialDarkVariables?: ThemeVariables;
  onSave: (name: string, lightVariables: ThemeVariables, darkVariables: ThemeVariables) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
  error?: string | null;
  mode?: "create" | "edit";
}

/**
 * Extract theme variables from a hidden element with specific class applied.
 * This avoids mutating the visible DOM during render.
 */
function extractThemeVariablesForMode(isDark: boolean): ThemeVariables {
  if (typeof document === "undefined") {
    return {} as ThemeVariables;
  }

  // Create a hidden element to extract computed styles without affecting the visible DOM
  const tempElement = document.createElement("div");
  tempElement.style.position = "absolute";
  tempElement.style.visibility = "hidden";
  tempElement.style.pointerEvents = "none";

  // Apply the appropriate class
  if (isDark) {
    tempElement.classList.add("dark");
  }

  document.body.appendChild(tempElement);

  // Get computed styles from the temp element
  // Note: CSS variables cascade, so we need to read from the root for the current mode
  const wasInDarkMode = document.documentElement.classList.contains("dark");

  // Temporarily switch mode to extract variables
  if (isDark && !wasInDarkMode) {
    document.documentElement.classList.add("dark");
  } else if (!isDark && wasInDarkMode) {
    document.documentElement.classList.remove("dark");
  }

  const variables = extractCurrentThemeVariables();

  // Restore original mode
  if (isDark && !wasInDarkMode) {
    document.documentElement.classList.remove("dark");
  } else if (!isDark && wasInDarkMode) {
    document.documentElement.classList.add("dark");
  }

  document.body.removeChild(tempElement);

  return variables;
}

/**
 * Full theme editor with color pickers for all 28 CSS variables
 */
export function ThemeEditor({
  initialName = "",
  initialLightVariables,
  initialDarkVariables,
  onSave,
  onCancel,
  isSaving = false,
  error,
  mode = "create",
}: ThemeEditorProps) {
  const [name, setName] = useState(initialName);
  const [editingMode, setEditingMode] = useState<"light" | "dark">("light");
  const [lightVariables, setLightVariables] = useState<ThemeVariables>(
    initialLightVariables ?? ({} as ThemeVariables)
  );
  const [darkVariables, setDarkVariables] = useState<ThemeVariables>(
    initialDarkVariables ?? ({} as ThemeVariables)
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(
    !!(initialLightVariables && initialDarkVariables)
  );

  // Extract theme variables on mount using useEffect to avoid render-time DOM mutation
  useEffect(() => {
    if (initialLightVariables && initialDarkVariables) {
      // Already have initial variables, no need to extract
      return;
    }

    // Extract variables after mount to avoid hydration issues
    const light = extractThemeVariablesForMode(false);
    const dark = extractThemeVariablesForMode(true);

    // One-time initialization is an acceptable use of setState in useEffect
    // eslint-disable-next-line react-hooks/set-state-in-effect -- One-time init from external DOM measurement
    setLightVariables(light);
    setDarkVariables(dark);
    setIsInitialized(true);
  }, [initialLightVariables, initialDarkVariables]);

  const currentVariables = editingMode === "light" ? lightVariables : darkVariables;
  const setCurrentVariables = editingMode === "light" ? setLightVariables : setDarkVariables;

  const handleVariableChange = useCallback(
    (variableName: ThemeVariableName, oklchValue: string) => {
      setCurrentVariables((prev) => {
        return { ...prev, [variableName]: oklchValue };
      });
    },
    [setCurrentVariables]
  );

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    await onSave(name.trim(), lightVariables, darkVariables);
  }, [name, lightVariables, darkVariables, onSave]);

  const getSaveButtonLabel = () => {
    if (isSaving) return "Saving...";
    if (mode === "create") return "Create Theme";
    return "Save Changes";
  };

  const editingModeLabel = editingMode === "light" ? "Light" : "Dark";

  // Show loading state while extracting theme variables
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading theme variables...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Editor panel */}
      <div className="space-y-6">
        {/* Name input */}
        <div className="space-y-2">
          <Label htmlFor="theme-name">Theme Name</Label>
          <Input
            id="theme-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Custom Theme"
          />
        </div>

        {/* Light/Dark mode toggle */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={editingMode === "light" ? "default" : "outline"}
            size="sm"
            onClick={() => setEditingMode("light")}
          >
            <Sun className="mr-1 h-4 w-4" />
            Light Mode
          </Button>
          <Button
            type="button"
            variant={editingMode === "dark" ? "default" : "outline"}
            size="sm"
            onClick={() => setEditingMode("dark")}
          >
            <Moon className="mr-1 h-4 w-4" />
            Dark Mode
          </Button>
        </div>

        {/* Core UI section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Core Colors</CardTitle>
            <CardDescription>Main UI colors used throughout the app</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {THEME_VARIABLE_GROUPS.core.map((varName) => (
                <ColorPicker
                  key={varName}
                  variableName={varName as ThemeVariableName}
                  label={THEME_VARIABLE_LABELS[varName as ThemeVariableName]}
                  oklchValue={currentVariables[varName as ThemeVariableName]}
                  onChange={handleVariableChange}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Components section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Components</CardTitle>
            <CardDescription>Card and popover specific colors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {THEME_VARIABLE_GROUPS.components.map((varName) => (
                <ColorPicker
                  key={varName}
                  variableName={varName as ThemeVariableName}
                  label={THEME_VARIABLE_LABELS[varName as ThemeVariableName]}
                  oklchValue={currentVariables[varName as ThemeVariableName]}
                  onChange={handleVariableChange}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Advanced section (collapsible) */}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Advanced</CardTitle>
                    <CardDescription>Sidebar and chart colors</CardDescription>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6">
                {/* Sidebar */}
                <div>
                  <h4 className="mb-3 text-sm font-medium">Sidebar</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {THEME_VARIABLE_GROUPS.sidebar.map((varName) => (
                      <ColorPicker
                        key={varName}
                        variableName={varName as ThemeVariableName}
                        label={THEME_VARIABLE_LABELS[varName as ThemeVariableName]}
                        oklchValue={currentVariables[varName as ThemeVariableName]}
                        onChange={handleVariableChange}
                      />
                    ))}
                  </div>
                </div>

                {/* Charts */}
                <div>
                  <h4 className="mb-3 text-sm font-medium">Charts</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {THEME_VARIABLE_GROUPS.charts.map((varName) => (
                      <ColorPicker
                        key={varName}
                        variableName={varName as ThemeVariableName}
                        label={THEME_VARIABLE_LABELS[varName as ThemeVariableName]}
                        oklchValue={currentVariables[varName as ThemeVariableName]}
                        onChange={handleVariableChange}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Error message */}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {getSaveButtonLabel()}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
        </div>
      </div>

      {/* Preview panel */}
      <div className="lg:sticky lg:top-4">
        <h3 className="mb-3 text-sm font-medium">
          Live Preview ({editingModeLabel} Mode)
        </h3>
        <ThemePreviewCard variables={currentVariables} />
      </div>
    </div>
  );
}
