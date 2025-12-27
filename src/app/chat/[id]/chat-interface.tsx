"use client";

/**
 * Chat Interface Component
 * Handles the conversation UI and message sending
 */

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { calculateCost, getContextWindow } from "@/lib/agent";
import { cn } from "@/lib/utils";
import { addMessage, archiveConversation, deleteConversation, runAgentAction, updateConversation } from "@/modules/chat/actions";
import { Archive, Bot, Loader2, MoreVertical, Send, Trash2, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import type { ChatConversationWithMessages, ChatMessage } from "@/modules/chat/types";

interface ChatInterfaceProps {
  readonly conversation: ChatConversationWithMessages;
}

export function ChatInterface({ conversation }: ChatInterfaceProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(conversation.messages);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Calculate cumulative token stats
  const tokenStats = useMemo(() => {
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (const msg of messages) {
      if (msg.inputTokens) totalInputTokens += msg.inputTokens;
      if (msg.outputTokens) totalOutputTokens += msg.outputTokens;
    }

    const totalTokens = totalInputTokens + totalOutputTokens;
    const totalCost = calculateCost(conversation.model, totalInputTokens, totalOutputTokens);
    const contextWindow = getContextWindow(conversation.model);
    const contextUsagePercent = (totalInputTokens / contextWindow) * 100;

    return {
      totalInputTokens,
      totalOutputTokens,
      totalTokens,
      totalCost,
      contextWindow,
      contextUsagePercent,
    };
  }, [messages, conversation.model]);

  // Focus input on mount and when not pending
  useEffect(() => {
    if (!isPending) {
      inputRef.current?.focus();
    }
  }, [isPending]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function updateMessageId(tempId: string, newId: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? { ...m, id: newId } : m))
    );
  }

  async function handleArchive() {
    setIsDeleting(true);
    const result = await archiveConversation(conversation.id);
    setIsDeleting(false);
    if (result.success) {
      router.push("/chat");
    } else {
      setError(result.error ?? "Failed to archive conversation");
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deleteConversation(conversation.id);
    setIsDeleting(false);
    setShowDeleteDialog(false);
    if (result.success) {
      router.push("/chat");
    } else {
      setError(result.error ?? "Failed to delete conversation");
    }
  }

  async function handleSend() {
    if (!input.trim() || isPending) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);

    // Optimistically add user message
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversationId: conversation.id,
      role: "user",
      content: userMessage,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);
    setTimeout(scrollToBottom, 100);

    startTransition(async () => {
      try {
        // Save user message to database
        const userResult = await addMessage(conversation.id, {
          role: "user",
          content: userMessage,
        });

        if (!userResult.success) {
          setError(userResult.error ?? "Failed to send message");
          return;
        }

        // Update the temp message with real ID
        if (userResult.id) {
          updateMessageId(tempUserMessage.id, userResult.id);
        }

        // Build conversation history for the agent
        const history = messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
        history.push({ role: "user", content: userMessage });

        // Run the agent (server action - API key is server-side only)
        const agentResult = await runAgentAction({
          prompt: history.map((h) => `${h.role}: ${h.content}`).join("\n"),
          model: conversation.model,
          systemPrompt: conversation.systemPrompt ?? undefined,
        });

        // Save assistant response with token counts
        const assistantResult = await addMessage(conversation.id, {
          role: "assistant",
          content: agentResult.text,
          inputTokens: agentResult.usage?.promptTokens,
          outputTokens: agentResult.usage?.completionTokens,
        });

        if (!assistantResult.success) {
          setError(assistantResult.error ?? "Failed to save response");
          return;
        }

        // Add assistant message to UI
        const assistantMessage: ChatMessage = {
          id: assistantResult.id ?? `temp-assistant-${Date.now()}`,
          conversationId: conversation.id,
          role: "assistant",
          content: agentResult.text,
          inputTokens: agentResult.usage?.promptTokens,
          outputTokens: agentResult.usage?.completionTokens,
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Update conversation title if this is the first exchange
        if (messages.length === 0) {
          const title = userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : "");
          await updateConversation(conversation.id, { title });
        }

        router.refresh();
        setTimeout(scrollToBottom, 100);
      } catch (err) {
        console.error("Chat error:", err);
        setError("An unexpected error occurred");
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <h1 className="text-xl font-semibold">
            {conversation.title ?? "New Chat"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {conversation.model.split("/").pop()}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/chat">All Chats</Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={isDeleting}>
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreVertical className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleArchive}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 pr-3 space-y-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Send a message to start the conversation</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} model={conversation.model} />
          ))
        )}
        {isPending && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <Card className="mt-auto">
        <CardContent className="p-3">
          {/* Token Stats Bar */}
          {tokenStats.totalTokens > 0 && (
            <div className="mb-3 p-2 bg-muted/50 rounded-md">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>
                  Context: {tokenStats.totalInputTokens.toLocaleString()} / {tokenStats.contextWindow.toLocaleString()} ({tokenStats.contextUsagePercent.toFixed(1)}%)
                </span>
                <span>
                  Total: {tokenStats.totalTokens.toLocaleString()} tokens • ${tokenStats.totalCost.toFixed(4)}
                </span>
              </div>
              <Progress
                value={Math.min(tokenStats.contextUsagePercent, 100)}
                className="h-1.5"
              />
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive mb-2">{error}</p>
          )}
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isPending}
              rows={1}
              className="min-h-[40px] max-h-[200px] resize-none"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isPending}
              size="icon"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MessageBubble({ message, model }: { readonly message: ChatMessage; readonly model: string }) {
  const isUser = message.role === "user";
  const hasTokens = message.inputTokens !== undefined && message.outputTokens !== undefined;
  const totalTokens = hasTokens ? (message.inputTokens ?? 0) + (message.outputTokens ?? 0) : 0;
  const cost = hasTokens ? calculateCost(model, message.inputTokens ?? 0, message.outputTokens ?? 0) : 0;

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>
      <div
        className={cn(
          "rounded-lg px-4 py-2 max-w-[80%]",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        {hasTokens && totalTokens > 0 && (
          <p className="text-xs opacity-70 mt-1">
            {totalTokens.toLocaleString()} tokens • ${cost.toFixed(4)}
          </p>
        )}
      </div>
    </div>
  );
}
