-- Create github_accounts table
-- Note: access_token is stored encrypted. In production, consider using
-- Supabase Vault (requires paid plan) or a dedicated secrets manager.
create table if not exists public.github_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  github_user_id bigint not null,
  github_username text not null,
  avatar_url text,
  account_label text not null default 'Personal',
  access_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Each user can only link a GitHub account once
  unique(user_id, github_user_id)
);

-- Create index for faster lookups
create index if not exists github_accounts_user_id_idx on public.github_accounts(user_id);

-- Enable RLS
alter table public.github_accounts enable row level security;

-- RLS policies: users can only see/manage their own GitHub accounts
create policy "Users can view own github accounts"
  on public.github_accounts for select
  using (auth.uid() = user_id);

create policy "Users can insert own github accounts"
  on public.github_accounts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own github accounts"
  on public.github_accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own github accounts"
  on public.github_accounts for delete
  using (auth.uid() = user_id);

-- Function to update updated_at timestamp
create or replace function public.handle_github_accounts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at
create trigger on_github_accounts_updated
  before update on public.github_accounts
  for each row
  execute function public.handle_github_accounts_updated_at();
