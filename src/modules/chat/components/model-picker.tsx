"use client";

/**
 * Model Picker Component
 * Treeview-style model selector organized by provider with filter settings
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
    formatPrice,
    MODEL_PROVIDERS,
    type ModelWithPricing,
} from "@/lib/openrouter";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, Settings2, Sparkles } from "lucide-react";
import { useCallback, useMemo, useState, useTransition } from "react";
import { updateHiddenModels } from "../actions";

interface ModelsByProvider {
  providerId: string;
  providerName: string;
  models: ModelWithPricing[];
}

interface ModelPickerProps {
  models: ModelWithPricing[];
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
  /** IDs of models the user has hidden */
  hiddenModelIds?: string[];
  /** Callback when hidden models change (for optimistic updates) */
  onHiddenModelsChange?: (hiddenModelIds: string[]) => void;
}

/**
 * Groups models by provider and sorts them alphabetically
 */
function groupModelsByProvider(models: ModelWithPricing[]): ModelsByProvider[] {
  const grouped = new Map<string, ModelWithPricing[]>();

  for (const model of models) {
    const existing = grouped.get(model.providerId) ?? [];
    existing.push(model);
    grouped.set(model.providerId, existing);
  }

  // Sort providers alphabetically by display name
  return Array.from(grouped.entries())
    .map(([providerId, providerModels]) => {
      const provider = Object.values(MODEL_PROVIDERS).find(
        (p) => p.id === providerId
      );
      return {
        providerId,
        providerName: provider?.name ?? providerId,
        // Sort models: free first, then alphabetically by name
        models: providerModels.sort((a, b) => {
          if (a.isFree && !b.isFree) return -1;
          if (!a.isFree && b.isFree) return 1;
          return a.name.localeCompare(b.name);
        }),
      };
    })
    .sort((a, b) => a.providerName.localeCompare(b.providerName));
}

/**
 * Get provider ID from a model ID
 */
function getProviderFromModelId(modelId: string): string {
  return modelId.split("/")[0];
}

export function ModelPicker({
  models,
  value,
  onChange,
  disabled,
  hiddenModelIds = [],
  onHiddenModelsChange,
}: ModelPickerProps) {
  const [isPending, startTransition] = useTransition();
  const [localHiddenModels, setLocalHiddenModels] = useState<Set<string>>(
    new Set(hiddenModelIds)
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Filter out hidden models for display
  const visibleModels = useMemo(
    () => models.filter((m) => !localHiddenModels.has(m.id)),
    [models, localHiddenModels]
  );

  const groupedModels = useMemo(
    () => groupModelsByProvider(visibleModels),
    [visibleModels]
  );

  // All models grouped (for settings panel)
  const allGroupedModels = useMemo(
    () => groupModelsByProvider(models),
    [models]
  );

  // Track which providers are expanded
  const selectedProviderId = getProviderFromModelId(value);

  const initialExpandedProviders = useMemo(
    () => new Set([selectedProviderId]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(
    initialExpandedProviders
  );

  const toggleProvider = (providerId: string) => {
    setExpandedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }
      return next;
    });
  };

  const handleModelSelect = (modelId: string) => {
    const providerId = getProviderFromModelId(modelId);
    if (!expandedProviders.has(providerId)) {
      setExpandedProviders((prev) => new Set([...prev, providerId]));
    }
    onChange(modelId);
  };

  const toggleModelVisibility = useCallback(
    (modelId: string, visible: boolean) => {
      setLocalHiddenModels((prev) => {
        const next = new Set(prev);
        if (visible) {
          next.delete(modelId);
        } else {
          next.add(modelId);
        }

        // Persist to database
        const newHiddenArray = Array.from(next);
        startTransition(async () => {
          await updateHiddenModels(newHiddenArray);
          onHiddenModelsChange?.(newHiddenArray);
        });

        return next;
      });
    },
    [onHiddenModelsChange]
  );

  const selectedModel = models.find((m) => m.id === value);
  const hiddenCount = localHiddenModels.size;

  return (
    <div className="space-y-4">
      {/* Selected model display */}
      {selectedModel && (
        <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">{selectedModel.name}</span>
            {selectedModel.isFree && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Sparkles className="h-3 w-3" />
                FREE
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground line-clamp-2">
            {selectedModel.description}
          </p>
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Input Price</p>
              <p className="font-medium">
                {formatPrice(selectedModel.inputPricePerMillion)} / 1M tokens
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Output Price</p>
              <p className="font-medium">
                {formatPrice(selectedModel.outputPricePerMillion)} / 1M tokens
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Context Length</p>
              <p className="font-medium">
                {(selectedModel.contextLength / 1000).toFixed(0)}K tokens
              </p>
            </div>
            {selectedModel.reasoningPricePerMillion > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Reasoning Price</p>
                <p className="font-medium">
                  {formatPrice(selectedModel.reasoningPricePerMillion)} / 1M
                  tokens
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings button */}
      <div className="flex justify-end">
        <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              disabled={disabled}
            >
              <Settings2 className="h-4 w-4" />
              Filter Models
              {hiddenCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {hiddenCount} hidden
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Model Visibility</SheetTitle>
              <SheetDescription>
                Toggle which models appear in the picker. Your preferences are
                saved automatically.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              {allGroupedModels.map((group) => (
                <div key={group.providerId} className="space-y-2">
                  <h4 className="font-medium text-sm">{group.providerName}</h4>
                  <div className="space-y-1">
                    {group.models.map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-sm truncate">{model.name}</span>
                          {model.isFree && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 gap-0.5 shrink-0"
                            >
                              <Sparkles className="h-2.5 w-2.5" />
                              FREE
                            </Badge>
                          )}
                        </div>
                        <Switch
                          checked={!localHiddenModels.has(model.id)}
                          onCheckedChange={(checked) =>
                            toggleModelVisibility(model.id, checked)
                          }
                          disabled={isPending}
                          aria-label={`Toggle ${model.name} visibility`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Provider treeview */}
      <div className="rounded-lg border divide-y max-h-[400px] overflow-y-auto">
        {groupedModels.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            All models are hidden. Use the filter settings to show models.
          </div>
        ) : (
          groupedModels.map((group) => (
            <Collapsible
              key={group.providerId}
              open={expandedProviders.has(group.providerId)}
              onOpenChange={() => toggleProvider(group.providerId)}
              disabled={disabled}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between px-3 py-2 h-auto font-medium hover:bg-muted/50 rounded-none"
                  disabled={disabled}
                >
                  <span className="flex items-center gap-2">
                    {group.providerName}
                    <span className="text-xs text-muted-foreground font-normal">
                      ({group.models.length})
                    </span>
                  </span>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 transition-transform",
                      expandedProviders.has(group.providerId) && "rotate-90"
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="py-1">
                  {group.models.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => handleModelSelect(model.id)}
                      disabled={disabled}
                      className={cn(
                        "w-full px-3 py-2 pl-6 text-left text-sm hover:bg-muted/50 transition-colors flex items-center justify-between gap-2",
                        value === model.id && "bg-muted",
                        disabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {value === model.id && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                        <span
                          className={cn(
                            "truncate",
                            value !== model.id && "ml-6"
                          )}
                        >
                          {model.name}
                        </span>
                        {model.isFree && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 gap-0.5 shrink-0"
                          >
                            <Sparkles className="h-2.5 w-2.5" />
                            FREE
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {model.isFree
                          ? "Free"
                          : `${formatPrice(model.inputPricePerMillion)} / ${formatPrice(model.outputPricePerMillion)}`}
                      </span>
                    </button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))
        )}
      </div>
    </div>
  );
}
