-- TradeMind ICT - Supabase database setup
-- Supabase dashboard -> SQL Editor -> New query -> paste ALL of this -> Run.
-- Safe to run again (it only creates what is missing).

-- ---------------------------------------------------------------
-- Helper: server-side "last changed" time, set on every insert/update
-- ---------------------------------------------------------------
create or replace function public.set_server_updated_at()
returns trigger language plpgsql as $$
begin
  new.server_updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------
-- Trades (one row per trade; deleted trades are kept as tombstones)
-- ---------------------------------------------------------------
create table if not exists public.trades (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  data jsonb,
  deleted boolean not null default false,
  client_updated_at timestamptz not null,
  server_updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists trades_user_server_idx on public.trades (user_id, server_updated_at);
drop trigger if exists trades_server_time on public.trades;
create trigger trades_server_time before insert or update on public.trades
  for each row execute function public.set_server_updated_at();

-- ---------------------------------------------------------------
-- Settings (account balance, risk %, alert decisions)
-- ---------------------------------------------------------------
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  client_updated_at timestamptz not null,
  server_updated_at timestamptz not null default now()
);
drop trigger if exists settings_server_time on public.user_settings;
create trigger settings_server_time before insert or update on public.user_settings
  for each row execute function public.set_server_updated_at();

-- ---------------------------------------------------------------
-- Scanner alerts relayed from your PC (so you see them away from home)
-- ---------------------------------------------------------------
create table if not exists public.alerts (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists alerts_user_created_idx on public.alerts (user_id, created_at desc);
drop trigger if exists alerts_server_time on public.alerts;
create trigger alerts_server_time before insert or update on public.alerts
  for each row execute function public.set_server_updated_at();

-- ---------------------------------------------------------------
-- Push notification tokens (one per phone)
-- ---------------------------------------------------------------
create table if not exists public.push_tokens (
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null,
  platform text,
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

-- ---------------------------------------------------------------
-- Error reports sent from the app
-- ---------------------------------------------------------------
create table if not exists public.error_reports (
  id bigserial primary key,
  user_id uuid references auth.users (id) on delete cascade default auth.uid(),
  message text,
  stack text,
  app_version text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Row level security: every user can only see and change their OWN rows
-- ---------------------------------------------------------------
alter table public.trades enable row level security;
alter table public.user_settings enable row level security;
alter table public.alerts enable row level security;
alter table public.push_tokens enable row level security;
alter table public.error_reports enable row level security;

drop policy if exists "own trades" on public.trades;
create policy "own trades" on public.trades
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own settings" on public.user_settings;
create policy "own settings" on public.user_settings
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own alerts" on public.alerts;
create policy "own alerts" on public.alerts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own push tokens" on public.push_tokens;
create policy "own push tokens" on public.push_tokens
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "send own error reports" on public.error_reports;
create policy "send own error reports" on public.error_reports
  for insert to authenticated with check (user_id = auth.uid());

-- ---------------------------------------------------------------
-- Account deletion (required by Google Play): deletes the user and,
-- through "on delete cascade", all of their data.
-- ---------------------------------------------------------------
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
