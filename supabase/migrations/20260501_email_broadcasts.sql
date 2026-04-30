-- Audit log for admin email broadcasts.
-- Captures who sent what, to which audiences, and the delivery outcome.
-- Body HTML is stored verbatim so we can re-send or inspect what users received.

create table if not exists public.email_broadcasts (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.profiles(id) on delete set null,
  subject text not null,
  body_html text not null,
  tiers text[] not null,
  recipient_count integer not null,
  sent_count integer not null,
  failed_count integer not null,
  dry_run boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists email_broadcasts_created_at_idx
  on public.email_broadcasts (created_at desc);

alter table public.email_broadcasts enable row level security;
-- Service-role only — no user policies. The admin API reads/writes via the
-- admin Supabase client, which bypasses RLS.
