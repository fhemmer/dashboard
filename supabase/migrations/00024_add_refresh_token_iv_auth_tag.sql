-- Add separate IV and auth_tag columns for refresh token encryption
-- Each encrypted value needs its own unique IV for proper AES-256-GCM security

ALTER TABLE public.mail_oauth_tokens
  ADD COLUMN refresh_token_iv text,
  ADD COLUMN refresh_token_auth_tag text;

-- Add check constraint to ensure refresh token has its own IV and auth_tag when present
ALTER TABLE public.mail_oauth_tokens
  ADD CONSTRAINT refresh_token_encryption_complete
  CHECK (
    (encrypted_refresh_token IS NULL AND refresh_token_iv IS NULL AND refresh_token_auth_tag IS NULL)
    OR
    (encrypted_refresh_token IS NOT NULL AND refresh_token_iv IS NOT NULL AND refresh_token_auth_tag IS NOT NULL)
  );
