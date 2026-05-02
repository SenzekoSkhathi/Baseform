-- User activity analytics
-- Adds last_seen tracking on profiles + a generic activity_events table
-- for per-user, per-event activity records that power the admin analytics
-- dashboard (online now, DAU/WAU/MAU, hour-of-day heatmap, top-active users).

alter table public.profiles
  add column if not exists last_seen_at timestamptz;

create index if not exists profiles_last_seen_at_idx
  on public.profiles (last_seen_at desc);

create table if not exists public.activity_events (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  event_type text not null,
  path text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_events_created_at_idx
  on public.activity_events (created_at desc);

create index if not exists activity_events_user_created_idx
  on public.activity_events (user_id, created_at desc);

create index if not exists activity_events_type_created_idx
  on public.activity_events (event_type, created_at desc);

alter table public.activity_events enable row level security;
-- Service-role only — the heartbeat / analytics APIs use the admin client
-- which bypasses RLS. No user-side policies are needed.
