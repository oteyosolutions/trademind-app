-- TradeMind ICT - TradingView alerts (run AFTER schema.sql)
-- Supabase dashboard -> SQL Editor -> New query -> paste ALL of this -> Run. Safe to run again.

-- ---------------------------------------------------------------
-- Secret webhook token per user (the bot creates it: python tradingview.py setup)
-- ---------------------------------------------------------------
create table if not exists public.webhook_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token text not null unique check (length(token) >= 24),
  created_at timestamptz not null default now()
);
alter table public.webhook_tokens enable row level security;
drop policy if exists "own webhook token" on public.webhook_tokens;
create policy "own webhook token" on public.webhook_tokens
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- Signals received from TradingView (written ONLY by the tv-webhook Edge Function)
-- ---------------------------------------------------------------
create table if not exists public.tv_signals (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  received_at timestamptz not null default now(),
  payload jsonb not null,
  status text not null default 'new' check (status in ('new', 'done', 'rejected')),
  result text,
  handled_at timestamptz
);
create index if not exists tv_signals_user_status_idx on public.tv_signals (user_id, status, received_at);
alter table public.tv_signals enable row level security;

-- you (the bot, logged in as you) can read your signals and mark them handled - nothing else
drop policy if exists "read own signals" on public.tv_signals;
create policy "read own signals" on public.tv_signals
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "mark own signals" on public.tv_signals;
create policy "mark own signals" on public.tv_signals
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- no insert/delete policy: only the Edge Function (service role) can add signals

-- the bot may only change the status columns, never the signal itself
revoke update on public.tv_signals from authenticated;
grant update (status, result, handled_at) on public.tv_signals to authenticated;
grant select on public.tv_signals to authenticated;
grant select, insert, update, delete on public.webhook_tokens to authenticated;

-- keep the table small: signals older than 30 days are removed by the webhook itself
