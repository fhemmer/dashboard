"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Bot, MessageSquare, Plus } from "lucide-react";
import Link from "next/link";

import type { ChatConversation } from "../types";
import { formatMessageDate, truncateMessage } from "../types";

interface ChatWidgetClientProps {
  recentConversations: ChatConversation[];
  totalConversations: number;
}

function getConversationCountText(count: number): string {
  if (count === 0) return "Start a conversation";
  return `${count} conversation${count === 1 ? "" : "s"}`;
}

/**
 * Chat Widget Client Component
 * Displays recent conversations and quick access to chat
 */
export function ChatWidgetClient({
  recentConversations,
  totalConversations,
}: ChatWidgetClientProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-start gap-2">
          <Bot className="h-4 w-4 text-muted-foreground mt-1" />
          <div>
            <CardTitle>AI Chat</CardTitle>
            <CardDescription className="text-xs">
              {getConversationCountText(totalConversations)}
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/chat/new" aria-label="New chat">
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/chat">View All</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {recentConversations.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              No conversations yet
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/chat/new">
                <Plus className="h-4 w-4 mr-2" />
                Start Chat
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentConversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/chat/${conversation.id}`}
                className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {conversation.title ?? "New Chat"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {truncateMessage(conversation.model.split("/").pop() ?? conversation.model, 20)}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatMessageDate(conversation.updatedAt)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
