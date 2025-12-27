-- Add archived_at column to chat_conversations for soft-delete/archive functionality
ALTER TABLE public.chat_conversations
ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL;

-- Index for filtering archived conversations
CREATE INDEX idx_chat_conversations_archived_at ON public.chat_conversations(archived_at);

-- Update RLS policy to only show non-archived by default is handled in application layer
