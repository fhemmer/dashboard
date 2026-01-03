-- Subscriptions and Credits System Migration
-- Implements tiered subscription system with credit-based usage limits

-- ============================================================================
-- Subscriptions Table
-- ============================================================================

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  tier text not null default 'free' check (tier in ('free', 'pro', 'pro_plus')),
  billing_cycle text check (billing_cycle in ('monthly', 'annual')),
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.subscriptions is 'User subscription plans (Free, Pro, Pro+)';
comment on column public.subscriptions.tier is 'free=$1/mo, pro=$15/mo, pro_plus=$35/mo credit';
comment on column public.subscriptions.status is 'active, canceled, past_due, trialing';

-- ============================================================================
-- User Credits Table (USD cents for precision)
-- ============================================================================

create table public.user_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  credits_cents int not null default 1000, -- Trial starts with $10.00
  trial_ends_at timestamptz, -- 7 days after signup for free users
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_credits is 'User credit balance in cents';
comment on column public.user_credits.credits_cents is 'Current credit balance in USD cents (1000 = $10.00)';
comment on column public.user_credits.trial_ends_at is 'When trial expires (7 days from signup)';

-- ============================================================================
-- Credit Transactions Table (Audit Trail)
-- ============================================================================

create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_cents int not null, -- negative for usage, positive for grants
  reason text not null, -- 'trial_credit', 'monthly_credit', 'ai_usage'
  reference_id uuid, -- chat_message.id or agent_run.id
  created_at timestamptz not null default now()
);

comment on table public.credit_transactions is 'Audit trail of all credit changes';
comment on column public.credit_transactions.amount_cents is 'Positive for grants, negative for usage';
comment on column public.credit_transactions.reason is 'trial_credit, monthly_credit, ai_usage';

-- ============================================================================
-- Indexes
-- ============================================================================

create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_stripe_customer on public.subscriptions(stripe_customer_id);
create index idx_subscriptions_stripe_subscription on public.subscriptions(stripe_subscription_id);
create index idx_user_credits_user_id on public.user_credits(user_id);
create index idx_credit_transactions_user_id on public.credit_transactions(user_id);
create index idx_credit_transactions_created_at on public.credit_transactions(created_at);

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.subscriptions enable row level security;
alter table public.user_credits enable row level security;
alter table public.credit_transactions enable row level security;

-- Users can view their own subscription
create policy "Users can view own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Users can view their own credits
create policy "Users can view own credits" on public.user_credits
  for select using (auth.uid() = user_id);

-- Users can view their own transactions
create policy "Users can view own transactions" on public.credit_transactions
  for select using (auth.uid() = user_id);

-- Service role can manage all records (for webhooks and background jobs)
-- These are handled by supabaseAdmin which bypasses RLS

-- ============================================================================
-- Trigger: Auto-create subscription and credits on profile creation
-- ============================================================================

create or replace function public.handle_new_user_credits()
returns trigger as $$
begin
  -- Create subscription record
  insert into public.subscriptions (user_id, tier, status)
  values (new.id, 'free', 'trialing');

  -- Create user credits with $10 trial credit
  insert into public.user_credits (user_id, credits_cents, trial_ends_at)
  values (new.id, 1000, now() + interval '7 days');

  -- Record the trial credit transaction
  insert into public.credit_transactions (user_id, amount_cents, reason)
  values (new.id, 1000, 'trial_credit');

  return new;
end;
$$ language plpgsql security definer;

-- Trigger on profile creation
create trigger on_profile_created_add_credits
  after insert on public.profiles
  for each row execute function public.handle_new_user_credits();

-- ============================================================================
-- Function: Reset Monthly Credits
-- Called by Inngest cron or Stripe webhook on billing period start
-- ============================================================================

create or replace function public.reset_monthly_credits(target_user_id uuid)
returns void as $$
declare
  user_tier text;
  credit_amount int;
begin
  -- Get user's current tier
  select tier into user_tier 
  from public.subscriptions 
  where user_id = target_user_id;

  -- Determine credit amount based on tier
  credit_amount := case user_tier
    when 'pro_plus' then 3500 -- $35.00
    when 'pro' then 1500      -- $15.00
    else 100                  -- $1.00 for free tier
  end;

  -- Reset credits (doesn't roll over)
  update public.user_credits
  set credits_cents = credit_amount, updated_at = now()
  where user_id = target_user_id;

  -- Record the transaction
  insert into public.credit_transactions (user_id, amount_cents, reason)
  values (target_user_id, credit_amount, 'monthly_credit');
end;
$$ language plpgsql security definer;

-- ============================================================================
-- Function: Deduct Credits
-- Called when AI is used
-- ============================================================================

create or replace function public.deduct_credits(
  target_user_id uuid,
  amount int,
  usage_reason text,
  ref_id uuid default null
)
returns boolean as $$
declare
  current_credits int;
begin
  -- Get current balance
  select credits_cents into current_credits
  from public.user_credits
  where user_id = target_user_id;

  -- Check if enough credits (allow negative for tracking)
  if current_credits is null then
    return false;
  end if;

  -- Deduct credits
  update public.user_credits
  set 
    credits_cents = credits_cents - amount,
    updated_at = now()
  where user_id = target_user_id;

  -- Record transaction (negative amount for usage)
  insert into public.credit_transactions (user_id, amount_cents, reason, reference_id)
  values (target_user_id, -amount, usage_reason, ref_id);

  return true;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- Function: Check if user can use paid models
-- Returns true if user has credits or is in trial
-- ============================================================================

create or replace function public.can_use_paid_models(target_user_id uuid)
returns boolean as $$
declare
  user_credits int;
  trial_end timestamptz;
begin
  select credits_cents, trial_ends_at 
  into user_credits, trial_end
  from public.user_credits
  where user_id = target_user_id;

  -- No record means not allowed
  if user_credits is null then
    return false;
  end if;

  -- Has credits available
  if user_credits > 0 then
    return true;
  end if;

  -- In active trial with credits
  if trial_end is not null and trial_end > now() and user_credits > 0 then
    return true;
  end if;

  return false;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- Function: Handle Trial Expiry
-- Called by Inngest when trial ends - resets to $1 free tier credit
-- ============================================================================

create or replace function public.handle_trial_expiry(target_user_id uuid)
returns void as $$
begin
  -- Update subscription status
  update public.subscriptions
  set status = 'active', updated_at = now()
  where user_id = target_user_id and status = 'trialing';

  -- Reset to free tier credit amount ($1.00)
  update public.user_credits
  set credits_cents = 100, trial_ends_at = null, updated_at = now()
  where user_id = target_user_id;

  -- Record the transaction
  insert into public.credit_transactions (user_id, amount_cents, reason)
  values (target_user_id, 100, 'trial_ended_free_credit');
end;
$$ language plpgsql security definer;
