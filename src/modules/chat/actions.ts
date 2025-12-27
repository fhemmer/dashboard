"use server";

/**
 * Chat Module Server Actions
 * Server-side functions for managing chat conversations
 *
 * NOTE: Uses type assertions for chat tables until migration is applied
 * and database types are regenerated.
 */

import { DEFAULT_MODEL, runAgent as executeAgent, type AgentOptions, type AgentResult } from "@/lib/agent";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

import type {
    ChatConversation,
    ChatConversationInput,
    ChatConversationWithMessages,
    ChatMessage,
    ChatMessageInput,
    ChatSummary,
    ConversationResult,
    ConversationsResult,
    CreateConversationResult,
    UpdateResult,
} from "./types";

// Temporary types until migration is applied
interface ConversationRow {
  id: string;
  user_id: string;
  title: string | null;
  model: string;
  system_prompt: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  tool_calls: unknown;
  tool_results: unknown;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
}

/**
 * Get all conversations for the current user
 */
export async function getConversations(includeArchived = false): Promise<ConversationsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { conversations: [], error: "Not authenticated" };
  }

  let query = supabase
    .from("chat_conversations" as "demo")
    .select("*")
    .eq("user_id", user.id);

  if (!includeArchived) {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query.order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching conversations:", error);
    return { conversations: [], error: error.message };
  }

  const conversations: ChatConversation[] = ((data as unknown as ConversationRow[]) ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    model: row.model,
    systemPrompt: row.system_prompt,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    archivedAt: row.archived_at ? new Date(row.archived_at) : null,
  }));

  return { conversations };
}

/**
 * Get a single conversation with all messages
 */
export async function getConversation(id: string): Promise<ConversationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { conversation: null, error: "Not authenticated" };
  }

  // Get conversation
  const { data: convData, error: convError } = await supabase
    .from("chat_conversations" as "demo")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (convError) {
    if (convError.code === "PGRST116") {
      return { conversation: null, error: "Conversation not found" };
    }
    console.error("Error fetching conversation:", convError);
    return { conversation: null, error: convError.message };
  }

  // Get messages
  const { data: msgData, error: msgError } = await supabase
    .from("chat_messages" as "demo")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (msgError) {
    console.error("Error fetching messages:", msgError);
    return { conversation: null, error: msgError.message };
  }

  const messages: ChatMessage[] = ((msgData as unknown as MessageRow[]) ?? []).map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as ChatMessage["role"],
    content: row.content,
    toolCalls: row.tool_calls as Record<string, unknown>[] | undefined,
    toolResults: row.tool_results as Record<string, unknown>[] | undefined,
    inputTokens: row.input_tokens ?? undefined,
    outputTokens: row.output_tokens ?? undefined,
    createdAt: new Date(row.created_at),
  }));

  const conv = convData as unknown as ConversationRow;
  const conversation: ChatConversationWithMessages = {
    id: conv.id,
    userId: conv.user_id,
    title: conv.title,
    model: conv.model,
    systemPrompt: conv.system_prompt,
    createdAt: new Date(conv.created_at),
    updatedAt: new Date(conv.updated_at),
    archivedAt: conv.archived_at ? new Date(conv.archived_at) : null,
    messages,
  };

  return { conversation };
}

/**
 * Create a new conversation
 */
export async function createConversation(
  input?: ChatConversationInput
): Promise<CreateConversationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data, error } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("chat_conversations" as "demo") as any)
    .insert({
      user_id: user.id,
      title: input?.title ?? null,
      model: input?.model ?? DEFAULT_MODEL,
      system_prompt: input?.systemPrompt ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating conversation:", error);
    return { success: false, error: error.message };
  }

  const inserted = data as unknown as { id: string };
  revalidatePath("/chat");
  return { success: true, id: inserted.id };
}

/**
 * Update conversation metadata
 */
export async function updateConversation(
  id: string,
  input: Partial<ChatConversationInput>
): Promise<UpdateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) updateData.title = input.title;
  if (input.model !== undefined) updateData.model = input.model;
  if (input.systemPrompt !== undefined) updateData.system_prompt = input.systemPrompt;

  const { error } = await supabase
    .from("chat_conversations" as "demo")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating conversation:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/chat");
  revalidatePath(`/chat/${id}`);
  return { success: true };
}

/**
 * Delete a conversation
 */
export async function deleteConversation(id: string): Promise<UpdateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("chat_conversations" as "demo")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting conversation:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/chat");
  return { success: true };
}

/**
 * Archive a conversation (soft delete)
 */
export async function archiveConversation(id: string): Promise<UpdateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("chat_conversations" as "demo")
    .update({ archived_at: new Date().toISOString() } as Record<string, unknown>)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error archiving conversation:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/chat");
  revalidatePath(`/chat/${id}`);
  return { success: true };
}

/**
 * Unarchive a conversation
 */
export async function unarchiveConversation(id: string): Promise<UpdateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("chat_conversations" as "demo")
    .update({ archived_at: null } as Record<string, unknown>)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error unarchiving conversation:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/chat");
  revalidatePath(`/chat/${id}`);
  return { success: true };
}

/**
 * Add a message to a conversation
 */
export async function addMessage(
  conversationId: string,
  input: ChatMessageInput
): Promise<UpdateResult & { id?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Verify ownership
  const { data: conv } = await supabase
    .from("chat_conversations" as "demo")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!conv) {
    return { success: false, error: "Conversation not found" };
  }

  const { data, error } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("chat_messages" as "demo") as any)
    .insert({
      conversation_id: conversationId,
      role: input.role,
      content: input.content,
      tool_calls: input.toolCalls ?? null,
      tool_results: input.toolResults ?? null,
      input_tokens: input.inputTokens ?? null,
      output_tokens: input.outputTokens ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error adding message:", error);
    return { success: false, error: error.message };
  }

  // Update conversation timestamp
  await supabase
    .from("chat_conversations" as "demo")
    .update({ updated_at: new Date().toISOString() } as Record<string, unknown>)
    .eq("id", conversationId);

  const inserted = data as unknown as { id: string };
  revalidatePath(`/chat/${conversationId}`);
  return { success: true, id: inserted.id };
}

/**
 * Get chat summary for widget
 */
export async function getChatSummary(): Promise<ChatSummary> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { recentConversations: [], totalConversations: 0 };
  }

  // Get total count
  const { count } = await supabase
    .from("chat_conversations" as "demo")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Get recent conversations
  const { data } = await supabase
    .from("chat_conversations" as "demo")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(3);

  const recentConversations: ChatConversation[] = ((data as unknown as ConversationRow[]) ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    model: row.model,
    systemPrompt: row.system_prompt,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    archivedAt: row.archived_at ? new Date(row.archived_at) : null,
  }));

  return {
    recentConversations,
    totalConversations: count ?? 0,
  };
}

/**
 * Run the AI agent (server action)
 * This must be a server action because OPENROUTER_API_KEY is server-side only
 */
export async function runAgentAction(options: AgentOptions): Promise<AgentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  return executeAgent(options);
}
