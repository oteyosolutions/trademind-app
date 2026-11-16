-- TradeMind ICT - economic calendar cache (run once, after schema.sql). Safe to run again.
-- Only the "calendar" Edge Function (service role) reads and writes this table.
create table if not exists public.calendar_cache (
  id int primary key check (id = 1),
  fetched_at timestamptz not null,
  events jsonb not null
);
alter table public.calendar_cache enable row level security;
-- no policies on purpose: app users get the calendar only through the Edge Function
