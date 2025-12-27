"use client";

/**
 * New Chat Page
 * Creates a new conversation and redirects to it
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_MODEL, getAvailableModels } from "@/lib/agent";
import { createConversation } from "@/modules/chat/actions";
import { Bot, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function NewChatPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const models = getAvailableModels();

  function handleStartChat() {
    setError(null);
    startTransition(async () => {
      const result = await createConversation({
        model,
        systemPrompt: systemPrompt || undefined,
      });

      if (result.success && result.id) {
        router.push(`/chat/${result.id}`);
      } else {
        setError(result.error ?? "Failed to create conversation");
      }
    });
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Chat</h1>
        <p className="text-muted-foreground">
          Configure your AI conversation settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Chat Settings</CardTitle>
          </div>
          <CardDescription>
            Choose your AI model and customize the conversation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="model">AI Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="system-prompt">System Prompt (Optional)</Label>
            <Textarea
              id="system-prompt"
              placeholder="Customize the AI's behavior with a system prompt..."
              value={systemPrompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSystemPrompt(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use the default assistant behavior
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            onClick={handleStartChat}
            disabled={isPending}
            className="w-full"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Start Chat"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
