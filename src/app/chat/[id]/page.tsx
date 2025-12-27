import { getConversation } from "@/modules/chat/actions";
import { notFound } from "next/navigation";
import { ChatInterface } from "./chat-interface";

interface ChatPageProps {
  readonly params: Promise<{ id: string }>;
}

/**
 * Chat Conversation Page
 * Displays a single conversation with the AI
 */
export default async function ChatConversationPage({ params }: ChatPageProps) {
  const { id } = await params;
  const { conversation, error } = await getConversation(id);

  if (error === "Conversation not found" || !conversation) {
    notFound();
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return <ChatInterface conversation={conversation} />;
}
