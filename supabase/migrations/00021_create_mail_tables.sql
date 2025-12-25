-- Mail Module: Account settings and encrypted OAuth tokens
-- Supports Outlook (Personal), Gmail, and hemmer.us (IMAP)

-- Table: mail_account_settings
-- Stores per-user mail account configurations
CREATE TABLE IF NOT EXISTS public.mail_account_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('outlook', 'gmail', 'imap')),
  account_name text NOT NULL, -- User-friendly name (e.g., "Work Gmail", "Personal Outlook")
  email_address text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  sync_frequency_minutes integer NOT NULL DEFAULT 5 CHECK (sync_frequency_minutes >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, provider, email_address)
);

CREATE INDEX IF NOT EXISTS mail_account_settings_user_id_idx ON public.mail_account_settings(user_id);
CREATE INDEX IF NOT EXISTS mail_account_settings_enabled_idx ON public.mail_account_settings(user_id, is_enabled);

-- Table: mail_oauth_tokens
-- Stores encrypted OAuth tokens and IMAP credentials
CREATE TABLE IF NOT EXISTS public.mail_oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.mail_account_settings(id) ON DELETE CASCADE,
  encrypted_access_token text NOT NULL, -- AES-256-GCM encrypted
  encrypted_refresh_token text, -- AES-256-GCM encrypted (OAuth only)
  token_expires_at timestamptz, -- OAuth expiry time
  iv text NOT NULL, -- Initialization vector for decryption
  auth_tag text NOT NULL, -- Authentication tag for GCM mode
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(account_id)
);

CREATE INDEX IF NOT EXISTS mail_oauth_tokens_account_id_idx ON public.mail_oauth_tokens(account_id);

-- Enable RLS
ALTER TABLE public.mail_account_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies: mail_account_settings
CREATE POLICY "Users can view own mail account settings" ON public.mail_account_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mail account settings" ON public.mail_account_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mail account settings" ON public.mail_account_settings
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mail account settings" ON public.mail_account_settings
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: mail_oauth_tokens
-- Only allow access to tokens for accounts owned by the user
CREATE POLICY "Users can view own mail tokens" ON public.mail_oauth_tokens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.mail_account_settings
      WHERE mail_account_settings.id = mail_oauth_tokens.account_id
      AND mail_account_settings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own mail tokens" ON public.mail_oauth_tokens
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mail_account_settings
      WHERE mail_account_settings.id = mail_oauth_tokens.account_id
      AND mail_account_settings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own mail tokens" ON public.mail_oauth_tokens
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.mail_account_settings
      WHERE mail_account_settings.id = mail_oauth_tokens.account_id
      AND mail_account_settings.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mail_account_settings
      WHERE mail_account_settings.id = mail_oauth_tokens.account_id
      AND mail_account_settings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own mail tokens" ON public.mail_oauth_tokens
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.mail_account_settings
      WHERE mail_account_settings.id = mail_oauth_tokens.account_id
      AND mail_account_settings.user_id = auth.uid()
    )
  );

-- Auto-update timestamp triggers
CREATE OR REPLACE FUNCTION public.handle_mail_account_settings_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_mail_account_settings_updated
  BEFORE UPDATE ON public.mail_account_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_mail_account_settings_updated_at();

CREATE OR REPLACE FUNCTION public.handle_mail_oauth_tokens_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_mail_oauth_tokens_updated
  BEFORE UPDATE ON public.mail_oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION public.handle_mail_oauth_tokens_updated_at();
