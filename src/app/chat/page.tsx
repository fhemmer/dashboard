import { Button } from "@/components/ui/button";
import { getConversations } from "@/modules/chat/actions";
import { Bot, Plus } from "lucide-react";
import Link from "next/link";
import { ConversationListItem } from "./conversation-list-item";

/**
 * Chat Page
 * Lists all chat conversations for the user
 */
export default async function ChatPage() {
  const { conversations, error } = await getConversations();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Chat</h1>
          <p className="text-muted-foreground">
            Chat with AI models using OpenRouter
          </p>
        </div>
        <Button asChild>
          <Link href="/chat/new">
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Link>
        </Button>
      </div>

      {error && (
        <div className="text-center py-8 text-destructive">{error}</div>
      )}

      {conversations.length === 0 ? (
        <div className="text-center py-12">
          <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">No conversations yet</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Start a new chat to begin your AI conversation
          </p>
          <Button variant="outline" asChild>
            <Link href="/chat/new">
              <Plus className="h-4 w-4 mr-2" />
              Start Chat
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {conversations.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
            />
          ))}
        </div>
      )}
    </div>
  );
}
