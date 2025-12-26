/**
 * Chat Module Types
 * Type definitions for the AI chat interface
 */

// ============================================================================
// Message Types
// ============================================================================

export type ChatRole = "user" | "assistant" | "system" | "tool";

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  toolCalls?: Record<string, unknown>[];
  toolResults?: Record<string, unknown>[];
  inputTokens?: number;
  outputTokens?: number;
  createdAt: Date;
}

export interface ChatMessageInput {
  role: ChatRole;
  content: string;
  toolCalls?: Record<string, unknown>[];
  toolResults?: Record<string, unknown>[];
}

// ============================================================================
// Conversation Types
// ============================================================================

export interface ChatConversation {
  id: string;
  userId: string;
  title: string | null;
  model: string;
  systemPrompt: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatConversationInput {
  title?: string;
  model?: string;
  systemPrompt?: string;
}

export interface ChatConversationWithMessages extends ChatConversation {
  messages: ChatMessage[];
}

// ============================================================================
// Summary Types
// ============================================================================

export interface ChatSummary {
  recentConversations: ChatConversation[];
  totalConversations: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ConversationsResult {
  conversations: ChatConversation[];
  error?: string;
}

export interface ConversationResult {
  conversation: ChatConversationWithMessages | null;
  error?: string;
}

export interface MessagesResult {
  messages: ChatMessage[];
  error?: string;
}

export interface CreateConversationResult {
  id?: string;
  success: boolean;
  error?: string;
}

export interface UpdateResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function formatMessageDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export function truncateMessage(content: string, maxLength: number = 100): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength).trim() + "...";
}
