-- Referral system: one code per user, track who referred who,
-- add referral credit columns to user_credits.

-- ── Referral codes ─────────────────────────────────────────────────────────────
create table if not exists public.referral_codes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  code    text not null unique,
  created_at timestamptz not null default now()
);

alter table public.referral_codes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'referral_codes' and policyname = 'referral_codes_own'
  ) then
    create policy "referral_codes_own"
      on public.referral_codes for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

-- ── Referral events ───────────────────────────────────────────────────────────
create table if not exists public.referrals (
  id          uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null references public.profiles(id) on delete cascade unique,
  code        text not null,
  credited_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists referrals_referrer_id_idx on public.referrals (referrer_id);

alter table public.referrals enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'referrals' and policyname = 'referrals_referrer_own'
  ) then
    create policy "referrals_referrer_own"
      on public.referrals for select
      to authenticated
      using (auth.uid() = referrer_id);
  end if;
end $$;

-- ── Referral credit columns on user_credits ───────────────────────────────────
alter table public.user_credits
  add column if not exists referral_pending     integer     not null default 0,
  add column if not exists referral_window_start timestamptz,
  add column if not exists referral_unlocked    boolean     not null default false;
