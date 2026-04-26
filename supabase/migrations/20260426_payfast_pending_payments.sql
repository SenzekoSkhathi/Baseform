-- Tracks every PayFast checkout from the moment it is initiated, so we can
-- detect ITN delivery failures *automatically* instead of waiting for a user
-- to report being stuck on free.
--
-- Lifecycle:
--   pending  → row created when /initiate generates the form
--   resolved → set by /notify when the ITN succeeds
--   stale    → set by the cron after >24h with no resolution
--
-- The cron alerts when a row is still pending after 10 minutes — that's the
-- canary for a misconfigured notify_url, a bad passphrase, or a network issue.

create table if not exists public.payfast_pending_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  m_payment_id text not null unique,
  plan_slug text not null,
  term_months integer,
  amount_zar numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'resolved', 'stale')),
  resolved_at timestamptz,
  alerted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists payfast_pending_payments_status_created_idx
  on public.payfast_pending_payments (status, created_at);

alter table public.payfast_pending_payments enable row level security;
-- No RLS policies: only the service role (server) reads or writes.
