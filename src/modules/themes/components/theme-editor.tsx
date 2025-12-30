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
import { useCallback, useMemo, useState } from "react";
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
 * Extract theme variables from the document for both light and dark modes
 */
function extractBothModeVariables(): { light: ThemeVariables; dark: ThemeVariables } {
  if (typeof document === "undefined") {
    // SSR fallback - will be overridden on client
    return { light: {} as ThemeVariables, dark: {} as ThemeVariables };
  }

  const wasInDarkMode = document.documentElement.classList.contains("dark");

  // Extract light mode
  if (wasInDarkMode) {
    document.documentElement.classList.remove("dark");
  }
  const light = extractCurrentThemeVariables();

  // Extract dark mode
  document.documentElement.classList.add("dark");
  const dark = extractCurrentThemeVariables();

  // Restore original mode
  if (!wasInDarkMode) {
    document.documentElement.classList.remove("dark");
  }

  return { light, dark };
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
  // Initialize variables once using lazy initializer
  const defaultVariables = useMemo(() => {
    if (initialLightVariables && initialDarkVariables) {
      return { light: initialLightVariables, dark: initialDarkVariables };
    }
    return extractBothModeVariables();
  }, [initialLightVariables, initialDarkVariables]);

  const [name, setName] = useState(initialName);
  const [editingMode, setEditingMode] = useState<"light" | "dark">("light");
  const [lightVariables, setLightVariables] = useState<ThemeVariables>(
    initialLightVariables ?? defaultVariables.light
  );
  const [darkVariables, setDarkVariables] = useState<ThemeVariables>(
    initialDarkVariables ?? defaultVariables.dark
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);

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
