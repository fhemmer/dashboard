import { getChatSummary } from "../actions";
import { ChatWidgetClient } from "./chat-widget-client";

/**
 * Chat Widget
 * Server component that fetches data and renders the client widget
 */
export async function ChatWidget() {
  const summary = await getChatSummary();

  return (
    <ChatWidgetClient
      recentConversations={summary.recentConversations}
      totalConversations={summary.totalConversations}
    />
  );
}
