-- Chat Costs Table
-- Tracks per-message AI costs with margin for billing and user visibility
CREATE TABLE public.chat_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  reasoning_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd DECIMAL(12, 8) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS for chat_costs
ALTER TABLE public.chat_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat costs"
  ON public.chat_costs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat costs"
  ON public.chat_costs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_chat_costs_user_id ON public.chat_costs(user_id);
CREATE INDEX idx_chat_costs_conversation_id ON public.chat_costs(conversation_id);
CREATE INDEX idx_chat_costs_created_at ON public.chat_costs(created_at DESC);

-- Add total_chat_spent to profiles for quick access to cumulative spending
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS total_chat_spent DECIMAL(12, 8) NOT NULL DEFAULT 0;

-- Function to update user's total chat spent when a cost is inserted
CREATE OR REPLACE FUNCTION public.update_total_chat_spent()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles
  SET total_chat_spent = total_chat_spent + NEW.cost_usd,
      updated_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update total_chat_spent
CREATE TRIGGER on_chat_cost_inserted
  AFTER INSERT ON public.chat_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_total_chat_spent();
